import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import MarketOrder, Agent, Bid
from backend.modules.marketplace import service as market_service
from typing import List

logger = logging.getLogger(__name__)

class MatchingEngine:
    """
    Autonomous Matching Engine for Agent Labor Market (Layer 4).
    Matches task orders with qualified agents and can trigger autonomous bidding.
    """

    async def find_qualified_agents(self, db: AsyncSession, order: MarketOrder) -> List[Agent]:
        """
        Scans the Agent Registry for agents matching the required skills and budget.
        """
        logger.info(f"MATCHING_ENGINE: Searching for agents for order {order.id}")
        
        # Simple skill/price matching logic
        # In Horizon 2, this would use semantic search/embeddings
        result = await db.execute(
            select(Agent)
            .where(Agent.price <= order.budget)
        )
        candidates = result.scalars().all()
        
        # Filter by skills (mock matching for now)
        qualified = []
        for agent in candidates:
            # Check if agent has required skills in metadata
            # (Assuming skills are part of description or a JSON field)
            qualified.append(agent)
            
        logger.info(f"MATCHING_ENGINE: Found {len(qualified)} potential matches for order {order.id}")
        return qualified

    async def trigger_autonomous_bidding(self, db: AsyncSession, order_id: str):
        """
        Simulates autonomous agents detecting a relevant order and placing a bid.
        """
        order = await market_service.get_order_by_id(db, order_id)
        if not order or order.status != "open":
            return

        qualified = await self.find_qualified_agents(db, order)
        
        for agent in qualified[:3]: # Limit to top 3 for demo
            # Check if agent has already bid
            existing_bids = await market_service.get_bids_for_order(db, order_id)
            if any(b.agent_id == agent.id for b in existing_bids):
                continue
                
            logger.info(f"MATCHING_ENGINE: Autonomous Agent {agent.id} is placing a bid.")
            from backend.schemas.marketplace import BidCreate
            await market_service.place_bid(db, order_id, BidCreate(
                agent_id=agent.id,
                amount=agent.price,
                proposal=f"I am a specialized {agent.name} node. My PoAE reliability is 99.9%."
            ))
