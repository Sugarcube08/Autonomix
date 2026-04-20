import os
import base64
from pathlib import Path
from dotenv import load_dotenv

# Load .env file relative to this file's directory (works in Docker and local)
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Use a deterministic seed for local development
PLATFORM_SECRET_SEED = os.getenv("PLATFORM_SECRET_SEED", "shoujiki_escrow_platform_secret_32")
if len(PLATFORM_SECRET_SEED) < 32:
    PLATFORM_SECRET_SEED = (PLATFORM_SECRET_SEED + " " * 32)[:32]
else:
    PLATFORM_SECRET_SEED = PLATFORM_SECRET_SEED[:32]

PLATFORM_WALLET = os.getenv("PLATFORM_WALLET", "") # Will be derived from seed if empty
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
SANDBOX_URL = os.getenv("SANDBOX_URL", "http://localhost:8001")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://shoujiki:shoujiki@db:5432/shoujiki")
SQUADS_PROGRAM_ID = os.getenv("SQUADS_PROGRAM_ID", "SQDS4Byj9s7BfR7atvH9iSnduXW1U9CAdX9rW5L2S8X")
SQUADS_MULTISIG_PDA = os.getenv("SQUADS_MULTISIG_PDA", "SQDS_PLATFORM_MULTISIG_ADDRESS_CHANGE_ME")
# Squads Multisig Program ID: SQDS4Byj9s7BfR7atvH9iSnduXW1U9CAdX9rW5L2S8X (devnet/Devnet standard)
