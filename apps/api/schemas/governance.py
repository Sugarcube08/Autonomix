from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class ProposalCreate(BaseModel):
    title: str
    description: str
    parameter_change: Optional[Dict] = None

class StakeRequest(BaseModel):
    amount: float

class ProposalResponse(BaseModel):
    id: str
    proposer_wallet: str
    title: str
    description: str
    status: str
    votes_for: float
    votes_against: float
    expires_at: datetime
    
    class Config:
        from_attributes = True

class NetworkStats(BaseModel):
    total_staked: float
    active_executors: int
    protocol_fee_ratio: float
    challenge_window: int
