from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.models import Agent
from app.schemas.agent import AgentCreate

async def create_agent(db: AsyncSession, agent_data: AgentCreate, creator_wallet: str):
    db_agent = Agent(
        id=agent_data.id,
        name=agent_data.name,
        description=agent_data.description,
        code=agent_data.code,
        price=agent_data.price,
        creator_wallet=creator_wallet
    )
    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent

async def get_agent(db: AsyncSession, agent_id: str):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    return result.scalars().first()

async def get_all_agents(db: AsyncSession):
    result = await db.execute(select(Agent))
    return result.scalars().all()
