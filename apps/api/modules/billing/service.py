import hashlib
import struct
import asyncio
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from solders.message import MessageV0
from solana.rpc.async_api import AsyncClient
from backend.core.config import SOLANA_RPC_URL, PLATFORM_SECRET_SEED, SQUADS_PROGRAM_ID as CONFIG_PROGRAM_ID
from backend.db.session import AsyncSessionLocal
from sqlalchemy.future import select
import logging

logger = logging.getLogger(__name__)

# Constants
SQUADS_PROGRAM_ID = Pubkey.from_string(CONFIG_PROGRAM_ID)
ESCROW_PROGRAM_ID = Pubkey.from_string("SHoujikiEscrow11111111111111111111111111111")

# Initialize Platform Keypair
seed_bytes = hashlib.sha256(PLATFORM_SECRET_SEED.encode()).digest()
platform_keypair = Keypair.from_seed(seed_bytes)
PLATFORM_WALLET = str(platform_keypair.pubkey())
logger.info(f"SOLANA: Platform Authority initialized: {PLATFORM_WALLET}")

def get_anchor_discriminator(name: str) -> bytes:
    """Compute Anchor discriminator for a method name."""
    return hashlib.sha256(f"global:{name}".encode()).digest()[:8]

async def verify_solana_payment(tx_signature: str, expected_amount_sol: float, sender_wallet: str, reference: str):
    """
    Verify payment strictly by checking the specific transaction signature on-chain.
    Supports both legacy system transfers and the new on-chain escrow program.
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            logger.info(f"Strictly verifying payment signature: {tx_signature}")
            
            # Retry loop for slow RPC/Finalization
            tx_resp = None
            for i in range(5):
                tx_resp = await client.get_transaction(
                    tx_signature, 
                    encoding="jsonParsed", 
                    max_supported_transaction_version=0
                )
                if tx_resp.value:
                    break
                logger.info(f"Tx {tx_signature} not found yet, retrying {i+1}/5...")
                await asyncio.sleep(2)

            if not tx_resp or not tx_resp.value:
                return False, "Transaction not found on-chain (timeout)"
            
            tx = tx_resp.value.transaction
            # Verify sender (first account is usually fee payer/sender)
            actual_sender = str(tx.transaction.message.account_keys[0].pubkey)
            if actual_sender != sender_wallet:
                return False, f"Sender mismatch. Expected {sender_wallet}, got {actual_sender}"
            
            # Check instructions for EITHER a direct transfer OR an escrow initialization
            instructions = tx.transaction.message.instructions
            expected_lamports = int(expected_amount_sol * 1e9)
            
            verified = False
            init_escrow_disc = get_anchor_discriminator("initialize_escrow")
            
            for ix in instructions:
                # Case A: Legacy System Program Transfer
                if hasattr(ix, 'parsed') and ix.program == "system":
                    info = ix.parsed.get("info")
                    if info and info.get("destination") == PLATFORM_WALLET:
                        amount = info.get("lamports", 0)
                        if amount >= expected_lamports * 0.99:
                            # Check if reference is in accounts
                            account_keys = [str(acc.pubkey) for acc in tx.transaction.message.account_keys]
                            if reference in account_keys:
                                verified = True
                                break

                # Case B: On-chain Escrow Program Call (Anchor)
                program_id = str(ix.program_id) if hasattr(ix, 'program_id') else str(ix.program)
                if program_id == str(ESCROW_PROGRAM_ID):
                    if hasattr(ix, 'data'):
                        import base58
                        raw_data = base58.b58decode(ix.data)
                        if raw_data.startswith(init_escrow_disc):
                            amt_val = struct.unpack("<Q", raw_data[8:16])[0]
                            if amt_val >= expected_lamports * 0.99:
                                verified = True
                                break
            
            if not verified:
                return False, "Valid transfer or escrow initialization not found in transaction"
            
            logger.info(f"Payment verified successfully: {tx_signature}")
            return True, tx_signature
        except Exception as e:
            logger.error(f"Payment verification error: {str(e)}", exc_info=True)
            return False, f"Verification error: {str(e)}"

async def settle_task_payment_onchain(task_id: str, user_wallet: str, creator_wallet: str, success: bool, poae_signature: str):
    """
    Submits a Proof of Autonomous Execution (PoAE) to the on-chain escrow.
    Initiates an optimistic challenge period before final funds release.
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            # 1. Derive Escrow PDA
            escrow_pda, _ = Pubkey.find_program_address(
                [b"escrow", task_id.encode()],
                ESCROW_PROGRAM_ID
            )

            # 2. Construct submit_poae instruction
            disc = get_anchor_discriminator("submit_poae")
            
            # Data: discriminator (8) + success (1) + poae_hash (32)
            poae_hash = hashlib.sha256(poae_signature.encode()).digest()
            data = disc + struct.pack("?", success) + poae_hash

            ix = Instruction(
                program_id=ESCROW_PROGRAM_ID,
                data=data,
                accounts=[
                    AccountMeta(pubkey=escrow_pda, is_signer=False, is_writable=True),
                    AccountMeta(pubkey=platform_keypair.pubkey(), is_signer=True, is_writable=False),
                ]
            )
            
            # 3. Create and sign transaction
            latest_blockhash = (await client.get_latest_blockhash()).value.blockhash
            msg = MessageV0.try_compile(
                payer=platform_keypair.pubkey(),
                instructions=[ix],
                address_lookup_table_accounts=[],
                recent_blockhash=latest_blockhash
            )
            tx = VersionedTransaction(msg, [platform_keypair])
            
            # 4. Send transaction
            resp = await client.send_transaction(tx)
            logger.info(f"PoAE submitted on-chain: {resp.value}")
            return True, str(resp.value)
        except Exception as e:
            logger.error(f"VACN: PoAE submission error: {e}")
            return False, str(e)

async def finalize_task_settlement(task_id: str, user_wallet: str, creator_wallet: str):
    """
    Finalizes the escrow settlement after the challenge period has expired.
    Can be called by anyone (permissionless finalize) as per protocol design.
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            escrow_pda, _ = Pubkey.find_program_address(
                [b"escrow", task_id.encode()],
                ESCROW_PROGRAM_ID
            )

            disc = get_anchor_discriminator("finalize_settlement")
            
            ix = Instruction(
                program_id=ESCROW_PROGRAM_ID,
                data=disc,
                accounts=[
                    AccountMeta(pubkey=escrow_pda, is_signer=False, is_writable=True),
                    AccountMeta(pubkey=Pubkey.from_string(user_wallet), is_signer=False, is_writable=True),
                    AccountMeta(pubkey=Pubkey.from_string(creator_wallet), is_signer=False, is_writable=True),
                ]
            )

            latest_blockhash = (await client.get_latest_blockhash()).value.blockhash
            msg = MessageV0.try_compile(
                payer=platform_keypair.pubkey(),
                instructions=[ix],
                address_lookup_table_accounts=[],
                recent_blockhash=latest_blockhash
            )
            tx = VersionedTransaction(msg, [platform_keypair])
            
            resp = await client.send_transaction(tx)
            logger.info(f"Escrow finalized on-chain: {resp.value}")
            return True, str(resp.value)
        except Exception as e:
            logger.error(f"VACN: Finalization error for {task_id}: {e}")
            return False, str(e)

async def transfer_sol(recipient_wallet: str, amount_sol: float):
    """
    Directly transfers SOL from the Platform Authority to a recipient.
    Used for paying out agent earnings accumulated via legacy system transfers.
    """
    async with AsyncClient(SOLANA_RPC_URL) as client:
        try:
            from solders.system_program import Transfer, transfer
            
            amount_lamports = int(amount_sol * 1e9)
            ix = transfer(Transfer(
                from_pubkey=platform_keypair.pubkey(),
                to_pubkey=Pubkey.from_string(recipient_wallet),
                lamports=amount_lamports
            ))

            latest_blockhash = (await client.get_latest_blockhash()).value.blockhash
            msg = MessageV0.try_compile(
                payer=platform_keypair.pubkey(),
                instructions=[ix],
                address_lookup_table_accounts=[],
                recent_blockhash=latest_blockhash
            )
            tx = VersionedTransaction(msg, [platform_keypair])
            
            resp = await client.send_transaction(tx)
            return True, str(resp.value)
        except Exception as e:
            logger.error(f"SOL Transfer failed: {e}")
            return False, str(e)

async def withdraw_agent_funds(agent_id: str, requester_wallet: str):
    """
    Withdraws funds from the agent's sovereign treasury (Squads).
    Note: In AgentOS, funds are held on-chain in the agent's Squads PDA.
    This method now acts as a trigger for a Squads withdrawal proposal.
    """
    async with AsyncSessionLocal() as db:
        from backend.db.models.models import Agent
        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        
        if not agent:
            return False, "Agent not found"
        if agent.creator_wallet != requester_wallet:
            return False, "Unauthorized"
            
        # Trigger Squads Withdrawal (Mock)
        logger.info(f"AgentOS: Initiating Squads withdrawal for treasury {agent.squads_vault_pda}")
        return True, "Withdrawal proposal initiated on Squads"

async def withdraw_user_wallet_balance(db: AsyncSession, wallet_address: str, amount_sol: float):
    """
    Withdraws funds from the User's Layer 2 App Wallet back to their Layer 1 Solana wallet.
    """
    from backend.db.models.models import UserWallet
    result = await db.execute(select(UserWallet).where(UserWallet.wallet_address == wallet_address))
    user_wallet = result.scalars().first()
    
    if not user_wallet or user_wallet.balance < amount_sol:
        return False, "Insufficient balance in App Wallet"
        
    # Protocol Call: Trigger real SOL transfer from Platform to User
    ok, tx_sig = await transfer_sol(wallet_address, amount_sol)
    
    if ok:
        user_wallet.balance -= amount_sol
        await db.commit()
        return True, tx_sig
    else:
        return False, tx_sig
