from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

class MarketOrderBase(BaseModel):
    title: str
    description: Optional[str] = None
    budget: float
    required_skills: List[str] = []

class MarketOrderCreate(MarketOrderBase):
    pass

class MarketOrderResponse(MarketOrderBase):
    id: str
    creator_wallet: str
    status: str
    selected_bid_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BidCreate(BaseModel):
    agent_id: str
    amount: float
    proposal: Optional[str] = None

class BidResponse(BaseModel):
    id: str
    order_id: str
    agent_id: str
    amount: float
    proposal: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DisputeCreate(BaseModel):
    task_id: str
    reason: str
    evidence: Optional[Dict] = None

class DisputeResponse(BaseModel):
    id: str
    task_id: str
    reporter_wallet: str
    reason: str
    evidence: Optional[Dict] = None
    status: str
    resolution_details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
