from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AgentCreditResponse(BaseModel):
    agent_id: str
    credit_score: float
    credit_limit: float
    utilization: float
    
    class Config:
        from_attributes = True

class LoanRequest(BaseModel):
    amount: float

class LoanResponse(BaseModel):
    id: str
    principal: float
    interest_rate: float
    balance_remaining: float
    due_at: datetime
    status: str
    
    class Config:
        from_attributes = True
