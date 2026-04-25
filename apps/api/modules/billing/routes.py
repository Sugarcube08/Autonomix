from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.core.dependencies import get_current_user
from backend.modules.billing import service as billing_service
from backend.schemas.auth import DepositRequest, WithdrawRequest, WalletResponse

router = APIRouter()

@router.get("/balance", response_model=WalletResponse)
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Returns the user's real in-app internal balance."""
    balance = await billing_service.get_internal_balance(db, current_user)
    return {"wallet_address": current_user, "balance": balance}

@router.post("/deposit")
async def deposit(
    req: DepositRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Verifies and credits a SOL deposit to the in-app wallet."""
    success, msg = await billing_service.deposit_to_internal_wallet(db, current_user, req.tx_signature)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@router.post("/withdraw")
async def withdraw(
    req: WithdrawRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Withdraws real SOL from the in-app wallet to the user's external wallet."""
    success, result = await billing_service.withdraw_from_internal_wallet(db, current_user, req.amount)
    if not success:
        raise HTTPException(status_code=400, detail=result)
    return {"message": "Withdrawal initiated", "tx_signature": result}

@router.post("/agent/{agent_id}/withdraw")
async def withdraw_agent_earnings(
    agent_id: str,
    current_user: str = Depends(get_current_user)
):
    success, result = await billing_service.withdraw_agent_funds(agent_id, current_user)
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=result)
    return {"message": "Withdrawal successful", "tx_signature": result}
