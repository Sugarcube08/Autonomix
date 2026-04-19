from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class RunRequest(BaseModel):
    agent_id: str
    input_data: dict
    tx_signature: str

class TaskResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[str] = None
    error: Optional[str] = None

class TaskHistoryResponse(BaseModel):
    id: str
    agent_id: str
    status: str
    result: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
