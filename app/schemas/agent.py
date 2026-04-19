from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

class AgentVersion(BaseModel):
    version: str
    files: Dict[str, str] # filename -> content
    requirements: List[str]
    entrypoint: str

class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

class AgentCreate(AgentBase):
    id: str
    files: Dict[str, str]
    requirements: List[str]
    entrypoint: str
    version: str = "v1"

class AgentResponse(AgentBase):
    id: str
    versions: List[AgentVersion]
    current_version: str
    creator_wallet: str
    created_at: datetime

    class Config:
        from_attributes = True
