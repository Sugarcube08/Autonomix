from pydantic import BaseModel

class WalletLoginRequest(BaseModel):
    public_key: str
    signature: str
    message: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
