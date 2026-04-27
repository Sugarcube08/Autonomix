import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from backend.db.models.models import MarketOrder, Bid, Dispute, Agent
from backend.schemas.marketplace import MarketOrderCreate, BidCreate, DisputeCreate
from typing import List, Optional

logger = logging.getLogger(__name__)

async def create_market_order(db: AsyncSession, order_data: MarketOrderCreate, creator_wallet: str) -> MarketOrder:
    order_id = f"ord_{uuid.uuid4().hex[:8]}"
    db_order = MarketOrder(
        id=order_id,
        creator_wallet=creator_wallet,
        title=order_data.title,
        description=order_data.description,
        budget=order_data.budget,
        required_skills=order_data.required_skills,
        status="open"
    )
    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)
    logger.info(f"MARKET: Created order {order_id} by {creator_wallet}")
    return db_order

async def get_market_orders(db: AsyncSession, status: Optional[str] = "open") -> List[MarketOrder]:
    query = select(MarketOrder)
    if status:
        query = query.where(MarketOrder.status == status)
    result = await db.execute(query)
    return result.scalars().all()

async def get_order_by_id(db: AsyncSession, order_id: str) -> Optional[MarketOrder]:
    result = await db.execute(select(MarketOrder).where(MarketOrder.id == order_id))
    return result.scalars().first()

async def place_bid(db: AsyncSession, order_id: str, bid_data: BidCreate) -> Bid:
    bid_id = f"bid_{uuid.uuid4().hex[:8]}"
    db_bid = Bid(
        id=bid_id,
        order_id=order_id,
        agent_id=bid_data.agent_id,
        amount=bid_data.amount,
        proposal=bid_data.proposal,
        status="pending"
    )
    db.add(db_bid)
    await db.commit()
    await db.refresh(db_bid)
    logger.info(f"MARKET: Agent {bid_data.agent_id} bid {bid_data.amount} on order {order_id}")
    return db_bid

async def get_bids_for_order(db: AsyncSession, order_id: str) -> List[Bid]:
    result = await db.execute(select(Bid).where(Bid.order_id == order_id))
    return result.scalars().all()

async def accept_bid(db: AsyncSession, order_id: str, bid_id: str, owner_wallet: str) -> bool:
    order = await get_order_by_id(db, order_id)
    if not order or order.creator_wallet != owner_wallet:
        return False
    
    bid_result = await db.execute(select(Bid).where(Bid.id == bid_id, Bid.order_id == order_id))
    bid = bid_result.scalars().first()
    if not bid:
        return False
    
    # Update order and bid status
    order.status = "active"
    order.selected_bid_id = bid_id
    bid.status = "accepted"
    
    # Reject other bids
    await db.execute(
        update(Bid)
        .where(Bid.order_id == order_id, Bid.id != bid_id)
        .values(status="rejected")
    )
    
    await db.commit()
    logger.info(f"MARKET: Order {order_id} accepted bid {bid_id}")
    return True

async def create_dispute(db: AsyncSession, dispute_data: DisputeCreate, reporter_wallet: str) -> Dispute:
    dispute_id = f"dis_{uuid.uuid4().hex[:8]}"
    db_dispute = Dispute(
        id=dispute_id,
        task_id=dispute_data.task_id,
        reporter_wallet=reporter_wallet,
        reason=dispute_data.reason,
        evidence=dispute_data.evidence,
        status="open"
    )
    db.add(db_dispute)
    await db.commit()
    await db.refresh(db_dispute)
    logger.info(f"MARKET: Dispute {dispute_id} created for task {dispute_data.task_id}")
    return db_dispute
