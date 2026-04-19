from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_db
from app.schemas.agent import AgentResponse
from app.modules.agents import service as agent_service

router = APIRouter()

@router.get("/featured", response_model=List[AgentResponse])
async def get_featured_agents(db: AsyncSession = Depends(get_db)):
    # For MVP, just return all agents
    return await agent_service.get_all_agents(db)
