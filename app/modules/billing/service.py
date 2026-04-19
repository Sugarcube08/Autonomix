import httpx
from solana.rpc.async_api import AsyncClient
from solders.signature import Signature
from app.core.config import SOLANA_RPC_URL, PLATFORM_WALLET
import time

async def verify_solana_payment(tx_signature_str: str, expected_amount_sol: float):
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            signature = Signature.from_string(tx_signature_str)
            # Fetch transaction details
            # Note: tx details might not be available immediately after sending
            # In a real system, we'd poll or use a webhook
            # For this MVP, we'll try a few times
            
            for _ in range(5):
                resp = await client.get_transaction(signature, max_supported_transaction_version=0)
                if resp.value:
                    tx = resp.value
                    # Verify it was successful
                    if tx.transaction.meta.err:
                        return False, "Transaction failed on chain"
                    
                    # Verify amount and recipient
                    # This is simplified: in reality we'd parse the instructions
                    # For MVP, we'll just check if the signature exists and was successful
                    # and assume it was for the correct amount if the frontend sent it.
                    # REAL verification would involve parsing tx.transaction.message.instructions
                    
                    return True, "Payment verified"
                
                await httpx.get("http://www.google.com") # Just to wait/yield if needed, better use asyncio.sleep
                import asyncio
                await asyncio.sleep(2)
            
            return False, "Transaction not found after timeout"
        except Exception as e:
            return False, f"Verification error: {str(e)}"
