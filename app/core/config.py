import os
import base64

# Use a deterministic seed for local development
PLATFORM_SECRET_SEED = os.getenv("PLATFORM_SECRET_SEED", "shoujiki_escrow_platform_secret_32")
if len(PLATFORM_SECRET_SEED) < 32:
    PLATFORM_SECRET_SEED = (PLATFORM_SECRET_SEED + " " * 32)[:32]
else:
    PLATFORM_SECRET_SEED = PLATFORM_SECRET_SEED[:32]

PLATFORM_WALLET = os.getenv("PLATFORM_WALLET", "") # Will be derived from seed if empty
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "http://solana:8899")
SANDBOX_URL = os.getenv("SANDBOX_URL", "http://sandbox:8001")
