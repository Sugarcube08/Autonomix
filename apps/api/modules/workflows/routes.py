from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid
import logging

from backend.db.session import get_db
from backend.db.models.models import Workflow, WorkflowRun
from backend.schemas.workflow import WorkflowCreate, WorkflowResponse, WorkflowRunRequest, WorkflowRunResponse, WorkflowRunHistoryResponse
from backend.core.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("", response_model=WorkflowResponse)
async def create_workflow(
    req: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    db_workflow = Workflow(
        id=req.id,
        name=req.name,
        creator_wallet=current_user,
        steps=[step.dict() for step in req.steps]
    )
    db.add(db_workflow)
    await db.commit()
    await db.refresh(db_workflow)
    return db_workflow

@router.post("/{workflow_id}/run", response_model=WorkflowRunResponse)
async def run_workflow(
    workflow_id: str,
    req: WorkflowRunRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    # 1. Get workflow and calculate total price
    from backend.db.models.models import Agent, UserWallet
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    total_price = 0.0
    for step in workflow.steps:
        agent_res = await db.execute(select(Agent).where(Agent.id == step["agent_id"]))
        agent = agent_res.scalars().first()
        if agent:
            total_price += agent.price
    
    # 2. Check internal balance
    wallet_res = await db.execute(select(UserWallet).where(UserWallet.wallet_address == current_user))
    wallet = wallet_res.scalars().first()
    
    if not wallet or wallet.balance < total_price:
        raise HTTPException(status_code=402, detail=f"Insufficient in-app balance. Required: {total_price} SOL")

    # 3. Deduct from in-app wallet (Escrowed for the whole swarm)
    wallet.balance -= total_price

    # 4. Create WorkflowRun
    run_id = str(uuid.uuid4())
    db_run = WorkflowRun(
        id=run_id,
        workflow_id=workflow.id,
        user_wallet=current_user,
        status="queued",
        current_step_index=0,
        results={"steps": [], "initial_input": req.initial_input}
    )
    db.add(db_run)
    await db.commit()

    # 5. Enqueue in background worker
    redis = request.app.state.redis
    await redis.enqueue_job(
        'run_workflow_task',
        run_id=run_id,
        workflow_id=workflow.id,
        initial_input=req.initial_input
    )
    
    return WorkflowRunResponse(
        run_id=run_id,
        status="queued",
        current_step_index=0
    )

@router.get("/me", response_model=List[WorkflowResponse])
async def list_my_workflows(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(select(Workflow).where(Workflow.creator_wallet == current_user))
    return result.scalars().all()

@router.get("/runs", response_model=List[WorkflowRunHistoryResponse])
async def list_my_workflow_runs(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = await db.execute(
        select(WorkflowRun).where(WorkflowRun.user_wallet == current_user).order_by(WorkflowRun.created_at.desc())
    )
    return result.scalars().all()
