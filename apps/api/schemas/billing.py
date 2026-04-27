from pydantic import BaseModel
from typing import Dict, Optional

class UserWalletResponse(BaseModel):
    wallet_address: str
    balance: float
    allowances: Dict[str, float]
    auto_topup_enabled: bool
    
    class Config:
        from_attributes = True

class DepositRequest(BaseModel):
    amount: float
