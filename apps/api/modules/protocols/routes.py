from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from backend.db.session import get_db
from backend.core.dependencies import get_current_user
from backend.modules.protocols import governance_service
from backend.schemas.governance import ProposalCreate, ProposalResponse, StakeRequest, NetworkStats
from backend.db.models.models import ProtocolProposal, ExecutorStake
from sqlalchemy.future import select
from sqlalchemy import func

router = APIRouter()

@router.get("/stats", response_model=NetworkStats)
async def get_network_stats(db: AsyncSession = Depends(get_db)):
    """Returns global VACN network metrics and parameters."""
    total_staked_res = await db.execute(select(func.sum(ExecutorStake.amount_staked)))
    exec_count_res = await db.execute(select(func.count(ExecutorStake.executor_id)))
    
    return NetworkStats(
        total_staked=total_staked_res.scalar() or 0.0,
        active_executors=exec_count_res.scalar() or 0,
        protocol_fee_ratio=governance_service.NETWORK_PARAMETERS["fee_ratio"],
        challenge_window=governance_service.NETWORK_PARAMETERS["challenge_window_seconds"]
    )

@router.post("/proposals", response_model=ProposalResponse)
async def submit_proposal(
    req: ProposalCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submits a new protocol governance proposal."""
    return await governance_service.create_proposal(
        db, current_user, req.title, req.description, req.parameter_change
    )

@router.get("/proposals", response_model=List[ProposalResponse])
async def list_proposals(db: AsyncSession = Depends(get_db)):
    """Lists all active protocol governance proposals."""
    res = await db.execute(select(ProtocolProposal).order_by(ProtocolProposal.created_at.desc()))
    return res.scalars().all()

@router.post("/stake")
async def stake_sol(
    req: StakeRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Allows a wallet to stake SOL to become an Executor Node."""
    await governance_service.stake_as_executor(db, current_user, req.amount)
    return {"message": "Staking successful"}
