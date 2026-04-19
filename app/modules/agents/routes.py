from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.db.session import get_db
from app.schemas.agent import AgentCreate, AgentResponse
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
    # 0. Check for replay attack
    existing_payment = await db.execute(select(Payment).where(Payment.tx_signature == req.tx_signature))
    if existing_payment.scalars().first():
        raise HTTPException(status_code=400, detail="Transaction signature already used (replay attack)")

    # 1. Get agent
    agent = await agent_service.get_agent(db, req.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # 2. Verify payment
    success, msg = await billing_service.verify_solana_payment(req.tx_signature, agent.price, current_user)
    if not success:
        raise HTTPException(status_code=402, detail=f"Payment verification failed: {msg}")
    
    # 3. Create task and payment records
    task_id = str(uuid.uuid4())
    db_task = Task(
        id=task_id,
        agent_id=agent.id,
        user_wallet=current_user,
        input_data=str(req.input_data),
        status="running"
    )
    db_payment = Payment(
        task_id=task_id,
        tx_signature=req.tx_signature,
        amount=agent.price,
        status="locked"
    )
    db.add(db_task)
    db.add(db_payment)
    await db.commit()

    # 4. Execute in sandbox
    exec_result = await execute_in_sandbox(agent.code, req.input_data)
    
    # 5. Update task and release payment
    db_task.status = "completed" if exec_result["success"] else "failed"
    db_task.result = exec_result["output"]
    if not exec_result["success"]:
        db_task.result = exec_result["error"]
    
    # Release payment to developer (conceptually)
    db_payment.status = "released"
    
    await db.commit()
    
    return TaskResponse(
        task_id=task_id,
        status=db_task.status,
        result=db_task.result if exec_result["success"] else None,
        error=exec_result["error"] if not exec_result["success"] else None
    )

@router.post("/deploy", response_model=AgentResponse)
async def deploy_agent(
    req: AgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # Check if agent ID already exists
    existing = await agent_service.get_agent(db, req.id)
    if existing:
        raise HTTPException(status_code=400, detail="Agent ID already exists")
    
    # Validate agent code structure
    valid, msg = validate_agent_code(req.code)
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

@router.get("/", response_model=List[AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    return await agent_service.get_all_agents(db)

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent = await agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent
