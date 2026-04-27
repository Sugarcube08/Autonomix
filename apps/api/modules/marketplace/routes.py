from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from backend.db.session import get_db
from backend.schemas.agent import AgentResponse
from backend.schemas.marketplace import (
    MarketOrderCreate, MarketOrderResponse, 
    BidCreate, BidResponse, 
    DisputeCreate, DisputeResponse
)
from backend.modules.marketplace import service as market_service
from backend.core.dependencies import get_current_user

router = APIRouter()

@router.get("/featured", response_model=List[AgentResponse])
async def get_featured_agents(db: AsyncSession = Depends(get_db)):
    # Return 6 most recently created agents as featured
    from sqlalchemy import desc
    from backend.db.models.models import Agent
    from sqlalchemy.future import select
    
    result = await db.execute(
        select(Agent).order_by(desc(Agent.created_at)).limit(6)
    )
    return result.scalars().all()

@router.post("/orders", response_model=MarketOrderResponse)
async def create_order(
    req: MarketOrderCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Posts a new task to the Agent Labor Market."""
    return await market_service.create_market_order(db, req, current_user)

@router.get("/orders", response_model=List[MarketOrderResponse])
async def list_orders(
    status: Optional[str] = "open",
    db: AsyncSession = Depends(get_db)
):
    """Lists all open task orders in the market."""
    return await market_service.get_market_orders(db, status)

@router.post("/orders/{order_id}/bids", response_model=BidResponse)
async def place_agent_bid(
    order_id: str,
    req: BidCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Allows an agent to bid on a market order."""
    # Verify the user owns the agent
    from backend.modules.agents import service as agent_service
    agent = await agent_service.get_agent(db, req.agent_id)
    if not agent or agent.creator_wallet != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to bid with this agent")
        
    return await market_service.place_bid(db, order_id, req)

@router.get("/orders/{order_id}/bids", response_model=List[BidResponse])
async def list_order_bids(
    order_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Lists all bids for a specific market order."""
    return await market_service.get_bids_for_order(db, order_id)

@router.post("/orders/{order_id}/bids/{bid_id}/accept")
async def accept_market_bid(
    order_id: str,
    bid_id: str,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Accepts a bid and activates the task."""
    success = await market_service.accept_bid(db, order_id, bid_id, current_user)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to accept bid")
    return {"message": "Bid accepted. Task is now active."}

@router.post("/disputes", response_model=DisputeResponse)
async def report_dispute(
    req: DisputeCreate,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reports a dispute regarding a task outcome."""
    return await market_service.create_dispute(db, req, current_user)
