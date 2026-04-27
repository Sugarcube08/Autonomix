import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import ProtocolProposal, ExecutorStake, Agent
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)

# Protocol Constants (Default State)
NETWORK_PARAMETERS = {
    "min_executor_stake": 10.0, # SOL
    "challenge_window_seconds": 300,
    "fee_ratio": 0.02, # 2% protocol fee
    "slashing_penalty": 0.5 # 50% of stake slashed on fraud
}

async def create_proposal(db: AsyncSession, proposer_wallet: str, title: str, description: str, params: dict):
    """
    Creates a new protocol-level governance proposal.
    """
    proposal_id = f"prop_{uuid.uuid4().hex[:8]}"
    db_prop = ProtocolProposal(
        id=proposal_id,
        proposer_wallet=proposer_wallet,
        title=title,
        description=description,
        parameter_change=params,
        expires_at=datetime.now() + timedelta(days=7)
    )
    db.add(db_prop)
    await db.commit()
    logger.info(f"GOVERNANCE: New proposal {proposal_id} created by {proposer_wallet}")
    return db_prop

async def stake_as_executor(db: AsyncSession, wallet_address: str, amount_sol: float):
    """
    Registers or tops up an executor node's stake.
    Higher stake = higher priority in VACN compute routing.
    """
    res = await db.execute(select(ExecutorStake).where(ExecutorStake.wallet_address == wallet_address))
    stake = res.scalars().first()
    
    if stake:
        stake.amount_staked += amount_sol
    else:
        stake = ExecutorStake(
            executor_id=f"exec_{uuid.uuid4().hex[:8]}",
            wallet_address=wallet_address,
            amount_staked=amount_sol
        )
        db.add(stake)
        
    await db.commit()
    logger.info(f"STAKING: Wallet {wallet_address} staked {amount_sol} SOL. Total: {stake.amount_staked}")
    return stake

async def slash_executor(db: AsyncSession, executor_id: str, severity: float = 1.0):
    """
    Slashes an executor's stake based on verified PoAE fraud proofs.
    """
    res = await db.execute(select(ExecutorStake).where(ExecutorStake.executor_id == executor_id))
    stake = res.scalars().first()
    
    if stake:
        penalty = stake.amount_staked * NETWORK_PARAMETERS["slashing_penalty"] * severity
        stake.amount_staked -= penalty
        stake.reputation_score -= 50.0
        if stake.amount_staked < NETWORK_PARAMETERS["min_executor_stake"]:
            stake.status = "jailed"
            
        await db.commit()
        logger.warning(f"SLASHING: Executor {executor_id} slashed by {penalty} SOL. Status: {stake.status}")
        return True
    return False
