import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from backend.db.models.models import UserWallet, Agent, Task
from typing import Optional, Dict

logger = logging.getLogger(__name__)

async def get_or_create_user_wallet(db: AsyncSession, wallet_address: str) -> UserWallet:
    """
    Retrieves the UserWallet for a given address, or creates one if it doesn't exist.
    """
    result = await db.execute(select(UserWallet).where(UserWallet.wallet_address == wallet_address))
    user_wallet = result.scalars().first()
    
    if not user_wallet:
        user_wallet = UserWallet(wallet_address=wallet_address, balance=0.0, allowances={})
        db.add(user_wallet)
        await db.commit()
        await db.refresh(user_wallet)
        logger.info(f"TREASURY_OS: Created new App Wallet for user {wallet_address}")
        
    return user_wallet

async def deposit_to_user_wallet(db: AsyncSession, wallet_address: str, amount_sol: float) -> bool:
    """
    Simulates a deposit into the user's App Wallet (Wallet OS Layer 2).
    """
    user_wallet = await get_or_create_user_wallet(db, wallet_address)
    user_wallet.balance += amount_sol
    await db.commit()
    logger.info(f"TREASURY_OS: User {wallet_address} deposited {amount_sol} SOL. New balance: {user_wallet.balance}")
    return True

async def check_and_deduct_fee(db: AsyncSession, user_wallet_address: str, agent_id: str, amount_sol: float) -> bool:
    """
    Auto Fee Deduction Engine (RFC-002, 3.1).
    Attempts to deduct the execution fee from the User's App Wallet based on allowances.
    """
    user_wallet = await get_or_create_user_wallet(db, user_wallet_address)
    
    # 1. Check if user has sufficient total balance
    if user_wallet.balance < amount_sol:
        logger.warning(f"TREASURY_OS: Insufficient balance in user wallet {user_wallet_address}")
        return False
        
    # 2. Check Allowances (if configured for this agent)
    # Note: If allowance is not set, we assume 'unlimited' for demo simplicity
    # but in production, we would require explicit allowance.
    allowance = user_wallet.allowances.get(agent_id)
    if allowance is not None and allowance < amount_sol:
        logger.warning(f"TREASURY_OS: Allowance exceeded for agent {agent_id} on wallet {user_wallet_address}")
        return False
        
    # 3. Deduct Fee
    user_wallet.balance -= amount_sol
    
    # Update allowance if it was set
    if allowance is not None:
        new_allowances = dict(user_wallet.allowances)
        new_allowances[agent_id] = allowance - amount_sol
        user_wallet.allowances = new_allowances
        
    await db.commit()
    logger.info(f"TREASURY_OS: Auto-deducted {amount_sol} SOL for agent {agent_id}. User {user_wallet_address} balance remaining: {user_wallet.balance}")
    return True

async def record_agent_earnings(db: AsyncSession, agent_id: str, amount_sol: float):
    """
    Updates the agent's internal ledger upon successful task completion (before on-chain settlement).
    """
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalars().first()
    
    if agent:
        agent.balance += amount_sol
        agent.total_earnings += amount_sol
        await db.commit()
        logger.info(f"TREASURY_OS: Agent {agent_id} earned {amount_sol} SOL. Total earnings: {agent.total_earnings}")
