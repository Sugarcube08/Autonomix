from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

class AgentCreate(AgentBase):
    id: str
    code: str

class AgentResponse(AgentBase):
    id: str
    creator_wallet: str
    created_at: datetime

    class Config:
        from_attributes = True
