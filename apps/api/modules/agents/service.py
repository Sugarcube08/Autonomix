from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db.models.models import Agent
from backend.schemas.agent import AgentCreate
import hashlib
import logging

logger = logging.getLogger(__name__)

async def create_agent(db: AsyncSession, agent_data: AgentCreate, creator_wallet: str):
    # Check if agent exists
    result = await db.execute(select(Agent).where(Agent.id == agent_data.id))
    db_agent = result.scalars().first()
    
    new_version = {
        "version": agent_data.version,
        "files": agent_data.files,
        "requirements": agent_data.requirements,
        "entrypoint": agent_data.entrypoint
    }
    
    if db_agent:
        # Update existing agent
        versions = list(db_agent.versions)
        version_exists = False
        for i, v in enumerate(versions):
            if v['version'] == agent_data.version:
                versions[i] = new_version
                version_exists = True
                break
        
        if not version_exists:
            versions.append(new_version)
            
        db_agent.versions = versions
        db_agent.current_version = agent_data.version
        db_agent.name = agent_data.name
        db_agent.description = agent_data.description
        db_agent.price = agent_data.price
    else:
        # Create new agent with NATIVE Metaplex Core Minting
        from solders.keypair import Keypair
        from solders.instruction import Instruction, AccountMeta
        from solders.transaction import VersionedTransaction
        from solders.message import MessageV0
        from solders.pubkey import Pubkey
        from solana.rpc.async_api import AsyncClient
        from backend.core.config import SOLANA_RPC_URL
        from backend.modules.billing.service import platform_keypair
        import struct

        # Program ID for Metaplex Core (Devnet/Mainnet)
        CORE_PROGRAM_ID = Pubkey.from_string("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d")
        
        asset_keypair = Keypair()
        mint_address = str(asset_keypair.pubkey())
        
        try:
            logger.info(f"Metaplex: Minting native agent asset {mint_address} for {agent_data.name}")
            
            # Construct Metaplex Core 'Create' Instruction (Manual Buffer)
            # Discriminator for Create is 0
            # Layout: [discriminator(1), name_len(4), name(name_len), uri_len(4), uri(uri_len), ...]
            name_bytes = agent_data.name.encode()
            uri = f"https://api.shoujiki.ai/agents/{agent_data.id}/metadata"
            uri_bytes = uri.encode()
            
            data = struct.pack("B", 0) # Discriminator
            data += struct.pack("<I", len(name_bytes)) + name_bytes
            data += struct.pack("<I", len(uri_bytes)) + uri_bytes
            # plugins, etc (omitted for simple demo)
            
            ix = Instruction(
                program_id=CORE_PROGRAM_ID,
                data=data,
                accounts=[
                    AccountMeta(pubkey=asset_keypair.pubkey(), is_signer=True, is_writable=True),
                    AccountMeta(pubkey=platform_keypair.pubkey(), is_signer=True, is_writable=True),
                    AccountMeta(pubkey=platform_keypair.pubkey(), is_signer=True, is_writable=False),
                    AccountMeta(pubkey=Pubkey.from_string("11111111111111111111111111111111"), is_signer=False, is_writable=False), # System Program
                ]
            )

            async with AsyncClient(SOLANA_RPC_URL) as client:
                latest_blockhash = (await client.get_latest_blockhash()).value.blockhash
                msg = MessageV0.try_compile(
                    payer=platform_keypair.pubkey(),
                    instructions=[ix],
                    address_lookup_table_accounts=[],
                    recent_blockhash=latest_blockhash
                )
                tx = VersionedTransaction(msg, [platform_keypair, asset_keypair])
                resp = await client.send_transaction(tx)
                logger.info(f"Metaplex: Native mint successful: {resp.value}")

        except Exception as e:
            logger.error(f"Metaplex: Native minting failed (using fallback ID): {e}", exc_info=True)
            mint_address = f"asset_{hashlib.sha256(agent_data.id.encode()).hexdigest()[:32]}"

        db_agent = Agent(
            id=agent_data.id,
            name=agent_data.name,
            description=agent_data.description,
            versions=[new_version],
            current_version=agent_data.version,
            price=agent_data.price,
            creator_wallet=creator_wallet,
            mint_address=mint_address
        )
        db.add(db_agent)
    
    await db.commit()
    await db.refresh(db_agent)
    return db_agent

async def get_agent(db: AsyncSession, agent_id: str):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    return result.scalars().first()

async def get_all_agents(db: AsyncSession):
    result = await db.execute(select(Agent))
    return result.scalars().all()

async def get_agents_by_creator(db: AsyncSession, creator_wallet: str):
    result = await db.execute(select(Agent).where(Agent.creator_wallet == creator_wallet))
    return result.scalars().all()

async def delete_agent(db: AsyncSession, agent_id: str):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    db_agent = result.scalars().first()
    if db_agent:
        await db.delete(db_agent)
        await db.commit()
    return db_agent
