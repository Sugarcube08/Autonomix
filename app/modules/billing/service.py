import httpx
from solana.rpc.async_api import AsyncClient
from solders.signature import Signature
from solders.pubkey import Pubkey
from app.core.config import SOLANA_RPC_URL, PLATFORM_WALLET
import time

async def verify_solana_payment(tx_signature_str: str, expected_amount_sol: float, sender_wallet: str):
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            signature = Signature.from_string(tx_signature_str)
            
            for _ in range(5):
                resp = await client.get_transaction(signature, max_supported_transaction_version=0)
                if resp.value:
                    tx = resp.value
                    if tx.transaction.meta.err:
                        return False, "Transaction failed on chain"
                    
                    # Verify amount and recipient
                    # In a System Program transfer, the instructions are in tx.transaction.transaction.message.instructions
                    message = tx.transaction.transaction.message
                    meta = tx.transaction.meta
                    
                    # Check if the platform wallet is the recipient and received the expected amount
                    # A simpler way for MVP: Check post-balances vs pre-balances for the platform wallet
                    account_keys = message.account_keys
                    platform_pubkey = Pubkey.from_string(PLATFORM_WALLET)
                    
                    try:
                        platform_index = account_keys.index(platform_pubkey)
                        pre_balance = meta.pre_balances[platform_index]
                        post_balance = meta.post_balances[platform_index]
                        transferred = (post_balance - pre_balance) / 10**9 # Convert lamports to SOL
                        
                        if transferred < expected_amount_sol * 0.99: # Allow for slight rounding/fees if any (though sender pays fees)
                            return False, f"Insufficient amount: transferred {transferred}, expected {expected_amount_sol}"
                        
                        # Verify sender
                        sender_pubkey = Pubkey.from_string(sender_wallet)
                        if account_keys[0] != sender_pubkey:
                             return False, f"Sender mismatch: expected {sender_wallet}, got {account_keys[0]}"

                        return True, "Payment verified"
                    except ValueError:
                        return False, "Platform wallet not found in transaction"
                
                import asyncio
                await asyncio.sleep(2)
            
            return False, "Transaction not found after timeout"
        except Exception as e:
            return False, f"Verification error: {str(e)}"
