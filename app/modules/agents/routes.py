from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.db.session import get_db
from app.schemas.agent import AgentCreate, AgentResponse, AgentTestRequest
from app.schemas.task import RunRequest, TaskResponse, TaskHistoryResponse
from app.modules.agents import service as agent_service
from app.modules.billing import service as billing_service
from app.modules.sandbox.client import execute_in_sandbox
from app.db.models.models import Task, Payment
from app.core.dependencies import get_current_user
from app.modules.agents.validation import validate_agent_code
import uuid

router = APIRouter()

@router.post("/run", response_model=TaskResponse)
async def run_agent(
    req: RunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # 1. Get agent
    agent = await agent_service.get_agent(db, req.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # 2. Verify escrow payment on-chain
    success, msg = await billing_service.verify_solana_payment(req.task_id, agent.price, current_user)
    if not success:
        raise HTTPException(status_code=402, detail=f"Escrow verification failed: {msg}")
    
    # 3. Create task record (using task_id from frontend)
    db_task = Task(
        id=req.task_id,
        agent_id=agent.id,
        user_wallet=current_user,
        input_data=str(req.input_data),
        status="running"
    )
    db.add(db_task)
    await db.commit()

    # 4. Execute in sandbox
    current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
    exec_result = await execute_in_sandbox(
        files=current_ver['files'],
        requirements=current_ver['requirements'],
        entrypoint=current_ver['entrypoint'],
        input_data=req.input_data
    )
    
    # 5. Update task and settle escrow on-chain
    db_task.status = "completed" if exec_result["success"] else "failed"
    db_task.result = exec_result["output"]
    if not exec_result["success"]:
        db_task.result = exec_result["error"]
    
    await db.commit()

    # On-chain settlement: payout if success, refund if failed
    settle_ok, tx_sig = await billing_service.settle_escrow(req.task_id, agent.creator_wallet, exec_result["success"])
    
    return TaskResponse(
        task_id=req.task_id,
        status=db_task.status,
        result=db_task.result if exec_result["success"] else None,
        error=exec_result["error"] if not exec_result["success"] else None
    )

@router.post("/test")
async def test_agent(
    req: AgentTestRequest,
    current_user: str = Depends(get_current_user)
):
    # Rapid development endpoint: no payment, no DB persistence
    entry_code = req.files.get(req.entrypoint, "")
    if not entry_code:
        raise HTTPException(status_code=400, detail=f"Entrypoint {req.entrypoint} not found")
        
    valid, msg = validate_agent_code(entry_code)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    return await execute_in_sandbox(
        files=req.files,
        requirements=req.requirements,
        entrypoint=req.entrypoint,
        input_data=req.input_data or {"test": True}
    )

@router.post("/deploy", response_model=AgentResponse)
async def deploy_agent(
    req: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # Validate agent code structure (entrypoint)
    entry_code = req.files.get(req.entrypoint)
    if not entry_code:
        raise HTTPException(status_code=400, detail=f"Entrypoint {req.entrypoint} not found in files")
        
    valid, msg = validate_agent_code(entry_code)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    return await agent_service.create_agent(db, req, current_user)

@router.get("/tasks", response_model=List[TaskHistoryResponse])
async def list_my_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(
        select(Task).where(Task.user_wallet == current_user).order_by(Task.created_at.desc())
    )
    return result.scalars().all()

@router.get("/me", response_model=List[AgentResponse])
async def list_my_agents(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return await agent_service.get_agents_by_creator(db, current_user)

@router.get("", response_model=List[AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    return await agent_service.get_all_agents(db)

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.creator_wallet != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to delete this agent")
    
    await agent_service.delete_agent(db, agent_id)
    return {"message": "Agent deleted successfully"}
