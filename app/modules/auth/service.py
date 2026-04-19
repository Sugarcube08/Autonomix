from solders.pubkey import Pubkey
from solders.signature import Signature
from app.core.security import create_access_token
import base58

def verify_wallet_signature(public_key_str: str, signature_str: str, message_str: str):
    try:
        pubkey = Pubkey.from_string(public_key_str)
        signature = Signature.from_string(signature_str)
        message = message_str.encode("utf-8")
        
        # solders Signature.verify(pubkey, message)
        if signature.verify(pubkey, message):
            return True
        return False
    except Exception as e:
        print(f"Signature verification failed: {e}")
        return False

def authenticate_wallet(public_key_str: str, signature_str: str, message_str: str):
    if verify_wallet_signature(public_key_str, signature_str, message_str):
        token = create_access_token(data={"sub": public_key_str})
        return token
    return None
