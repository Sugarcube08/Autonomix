from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from backend.db.session import get_db
from backend.schemas.agent import AgentCreate, AgentResponse, AgentTestRequest
from backend.schemas.task import RunRequest, TaskResponse, TaskHistoryResponse
from backend.modules.agents import service as agent_service
from backend.modules.billing import service as billing_service
from backend.modules.sandbox.client import execute_in_sandbox
from backend.db.models.models import Task, Payment
from backend.core.dependencies import get_current_user
from backend.modules.agents.validation import validate_agent_code
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/run", response_model=TaskResponse)
async def run_agent(
    request: Request,
    req: RunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # 1. Get agent
    agent = await agent_service.get_agent(db, req.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # 2. Check internal balance
    from backend.db.models.models import UserWallet
    wallet_res = await db.execute(select(UserWallet).where(UserWallet.wallet_address == current_user))
    wallet = wallet_res.scalars().first()
    
    if not wallet or wallet.balance < agent.price:
        raise HTTPException(status_code=402, detail=f"Insufficient in-app balance. Required: {agent.price} SOL")

    # 3. Deduct from in-app wallet immediately (Escrowed)
    wallet.balance -= agent.price
    
    # 4. Create task record
    db_task = Task(
        id=req.task_id,
        agent_id=agent.id,
        user_wallet=current_user,
        input_data=str(req.input_data),
        status="queued"
    )
    db.add(db_task)
    await db.commit()

    # 5. Enqueue in background worker
    redis = request.app.state.redis
    await redis.enqueue_job(
        'run_agent_task',
        task_id=req.task_id,
        agent_id=agent.id,
        input_data=req.input_data,
        creator_wallet=agent.creator_wallet,
        price=agent.price
    )
    
    return TaskResponse(
        task_id=req.task_id,
        status="queued",
        result=None,
        error=None
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
        
    valid, msg = validate_agent_code(entry_code, available_files=list(req.files.keys()))
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
        
    valid, msg = validate_agent_code(entry_code, available_files=list(req.files.keys()))
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    return await agent_service.create_agent(db, req, current_user)

@router.post("/deploy/zip", response_model=AgentResponse)
async def deploy_agent_zip(
    file: UploadFile = File(...),
    id: str = Form(...),
    name: str = Form(...),
    description: str = Form(""),
    price: float = Form(0.01),
    entrypoint: str = Form("main.py"),
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    import zipfile
    import io
    
    # 1. Read and extract ZIP
    zip_bytes = await file.read()
    zip_buffer = io.BytesIO(zip_bytes)
    
    files = {}
    with zipfile.ZipFile(zip_buffer, "r") as zip_ref:
        for filename in zip_ref.namelist():
            if not filename.endswith('/'): # Skip directories
                with zip_ref.open(filename) as f:
                    files[filename] = f.read().decode('utf-8', errors='ignore')
    
    # 2. Validate entrypoint
    entry_code = files.get(entrypoint)
    if not entry_code:
        raise HTTPException(status_code=400, detail=f"Entrypoint {entrypoint} not found in zip")
        
    valid, msg = validate_agent_code(entry_code, available_files=list(files.keys()))
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    # 3. Create Agent object for service
    agent_data = AgentCreate(
        id=id,
        name=name,
        description=description,
        price=price,
        files=files,
        requirements=[], # Standard pre-installed env
        entrypoint=entrypoint,
        version="v1"
    )
    
    return await agent_service.create_agent(db, agent_data, current_user)

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
