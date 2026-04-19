from pydantic import BaseModel
from typing import Optional, Any

class RunRequest(BaseModel):
    agent_id: str
    input_data: dict
    tx_signature: str

class TaskResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[str] = None
    error: Optional[str] = None
