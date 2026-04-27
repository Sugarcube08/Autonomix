from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.dependencies import get_current_user
from backend.db.session import get_db
from backend.modules.billing import service as billing_service
from backend.modules.billing import treasury_service
from backend.schemas.billing import UserWalletResponse, DepositRequest

router = APIRouter()

@router.get("/wallet/me", response_model=UserWalletResponse)
async def get_my_app_wallet(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves the user's Layer 2 App Wallet (Wallet OS)."""
    return await treasury_service.get_or_create_user_wallet(db, current_user)

@router.post("/wallet/deposit")
async def deposit_to_app_wallet(
    req: DepositRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Simulates a deposit into the Layer 2 App Wallet."""
    success = await treasury_service.deposit_to_user_wallet(db, current_user, req.amount)
    if not success:
        raise HTTPException(status_code=400, detail="Deposit failed")
    return {"message": "Deposit successful"}

@router.post("/wallet/withdraw")
async def withdraw_from_app_wallet(
    req: DepositRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Withdraws funds from the Layer 2 App Wallet back to Layer 1."""
    success, result = await billing_service.withdraw_user_wallet_balance(db, current_user, req.amount)
    if not success:
        raise HTTPException(status_code=400, detail=result)
    return {"message": "Withdrawal initiated", "tx_signature": result}

from backend.modules.billing import credit_service
from backend.schemas.capital import AgentCreditResponse, LoanRequest, LoanResponse

@router.get("/agent/{agent_id}/credit", response_model=AgentCreditResponse)
async def get_agent_credit_profile(
    agent_id: str,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves the credit and lending profile for a specific agent."""
    # Verify ownership
    from backend.modules.agents import service as agent_service
    agent = await agent_service.get_agent(db, agent_id)
    if not agent or agent.creator_wallet != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return await credit_service.get_or_create_agent_credit(db, agent_id)

@router.post("/agent/{agent_id}/credit/refresh")
async def refresh_agent_credit_score(
    agent_id: str,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Triggers a recalculation of the agent's protocol credit score."""
    await credit_service.update_agent_credit_score(db, agent_id)
    return {"message": "Credit score updated"}

@router.post("/agent/{agent_id}/loans", response_model=dict)
async def apply_for_agent_loan(
    agent_id: str,
    req: LoanRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Requests an undercollateralized loan for an agent's treasury."""
    from backend.modules.agents import service as agent_service
    agent = await agent_service.get_agent(db, agent_id)
    if not agent or agent.creator_wallet != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    success, result = await credit_service.request_agent_loan(db, agent_id, req.amount)
    if not success:
        raise HTTPException(status_code=400, detail=result)
        
    return {"message": "Loan approved and funded", "loan_id": result}

@router.get("/config")
async def get_billing_config():
    """Returns protocol-level billing configuration."""
    return {
        "platform_wallet": billing_service.PLATFORM_WALLET,
        "escrow_program_id": str(billing_service.ESCROW_PROGRAM_ID)
    }

@router.post("/agent/{agent_id}/withdraw")
async def withdraw_agent_earnings(
    agent_id: str,
    current_user: str = Depends(get_current_user)
):
    """Withdraws settled agent earnings from the platform wallet."""
    success, result = await billing_service.withdraw_agent_funds(agent_id, current_user)
    if not success:
        raise HTTPException(status_code=400, detail=result)
    return {"message": "Withdrawal successful", "tx_signature": result}
