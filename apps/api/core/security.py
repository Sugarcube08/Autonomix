from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
import os

SECRET_KEY = os.getenv("SECRET_KEY", "shoujiki-secret-key-change-in-production")
ALGORITHM = "HS256"
# Read from env, default to 1 day (1440 minutes)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    # Use timezone-aware UTC
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        # Added 60 seconds leeway to account for clock drift between client and server
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"leeway": 60})
        return payload
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        return None
    except JWTError as e:
        print(f"JWT validation error: {e}")
        return None
    except Exception as e:
        print(f"Unexpected token verification error: {e}")
        return None
