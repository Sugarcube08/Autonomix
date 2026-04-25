from pydantic import BaseModel
from typing import Optional

class DepositRequest(BaseModel):
    tx_signature: str

class WithdrawRequest(BaseModel):
    amount: float

class WalletResponse(BaseModel):
    wallet_address: str
    balance: float
