import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import Agent, AgentCredit, AgentLoan, AgentBond
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)

async def get_or_create_agent_credit(db: AsyncSession, agent_id: str) -> AgentCredit:
    """
    Retrieves or initializes credit profile for an agent based on their VACN performance.
    """
    result = await db.execute(select(AgentCredit).where(AgentCredit.agent_id == agent_id))
    credit = result.scalars().first()
    
    if not credit:
        # Default starting credit profile
        credit = AgentCredit(
            agent_id=agent_id,
            credit_score=500.0,
            credit_limit=0.0
        )
        db.add(credit)
        await db.commit()
        await db.refresh(credit)
        logger.info(f"CAPITAL_LAYER: Initialized credit profile for agent {agent_id}")
        
    return credit

async def update_agent_credit_score(db: AsyncSession, agent_id: str):
    """
    Calculates agent credit score (RFC-002 / Layer 6 Primitive).
    Factors: successful_runs, total_runs (reliability), and total_earnings (revenue).
    """
    agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_res.scalars().first()
    if not agent: return

    credit = await get_or_create_agent_credit(db, agent_id)
    
    # 1. Reliability Component (Max 300 points)
    reliability = agent.successful_runs / agent.total_runs if agent.total_runs > 0 else 1.0
    rel_score = reliability * 300.0
    
    # 2. Revenue Component (Max 250 points)
    # Scales with earnings, capped at 10 SOL for max points
    rev_score = min(agent.total_earnings / 10.0, 1.0) * 250.0
    
    # 3. Base Score
    base_score = 300.0
    
    new_score = base_score + rel_score + rev_score
    credit.credit_score = min(850.0, new_score) # Cap at 850
    
    # 4. Update Credit Limit (undercollateralized lending primitive)
    # Agents get 10% of their earnings or a floor based on high credit scores
    earnings_limit = agent.total_earnings * 0.2
    score_multiplier = (credit.credit_score - 500.0) / 350.0 if credit.credit_score > 500 else 0
    limit = max(earnings_limit, score_multiplier * 5.0) # Up to 5 SOL for elite agents
    
    credit.credit_limit = limit
    
    await db.commit()
    logger.info(f"CAPITAL_LAYER: Updated credit score for {agent_id} to {credit.credit_score}. Limit: {credit.credit_limit} SOL")

async def request_agent_loan(db: AsyncSession, agent_id: str, amount: float) -> (bool, str):
    """
    Processes a loan request from an agent's treasury.
    """
    credit = await get_or_create_agent_credit(db, agent_id)
    
    available = credit.credit_limit - credit.utilization
    if amount > available:
        return False, f"Insufficient credit limit. Available: {available} SOL"
    
    # Create the loan record
    loan_id = f"loan_{uuid.uuid4().hex[:8]}"
    interest_rate = 15.0 # 15% APR baseline
    if credit.credit_score > 700: interest_rate = 8.0
    
    due_date = datetime.now() + timedelta(days=30)
    
    new_loan = AgentLoan(
        id=loan_id,
        agent_id=agent_id,
        lender_wallet="AGENTOS_TREASURY_RESERVE",
        principal=amount,
        interest_rate=interest_rate,
        term_days=30,
        balance_remaining=amount * (1 + (interest_rate/100)),
        due_at=due_date
    )
    
    # Update utilization
    credit.utilization += amount
    
    # Fund the agent's internal ledger balance immediately (Machine Credit)
    agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = agent_res.scalars().first()
    agent.balance += amount
    
    db.add(new_loan)
    await db.commit()
    
    logger.info(f"CAPITAL_LAYER: Agent {agent_id} borrowed {amount} SOL. Loan ID: {loan_id}")
    return True, loan_id
