from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.db.session import engine, Base, get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from backend.modules.auth.routes import router as auth_router
from backend.modules.agents.routes import router as agents_router
from backend.modules.billing.routes import router as billing_router
from backend.modules.workflows.routes import router as workflows_router
from backend.modules.auth.middleware import X402PaymentMiddleware
from arq import create_pool
from arq.connections import RedisSettings
import os
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify environment
    from backend.core.security import SECRET_KEY
    if SECRET_KEY == "shoujiki-secret-key-change-in-production":
        logger.warning("SECRET_KEY is using the default value. Token validation may fail if .env is not loaded.")
    else:
        logger.info("SECRET_KEY loaded from environment.")

    # Initialize Redis pool for background tasks
    app.state.redis = await create_pool(RedisSettings(host=REDIS_HOST, port=REDIS_PORT))
    logger.info("Redis pool initialized")

    # Startup: Create tables with retries (Wait for DB to awaken)
    max_retries = 10
    retry_delay = 3
    for i in range(max_retries):
        try:
            async with engine.begin() as conn:
                # 1. Ensure tables exist
                from backend.db.models.models import Agent, Task, Payment
                await conn.run_sync(Base.metadata.create_all)
                
                # 2. Manual Migration: Add missing columns if they don't exist
                # This handles cases where Render DB already exists but code has new fields
                try:
                    await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS total_runs FLOAT DEFAULT 0"))
                    await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS successful_runs FLOAT DEFAULT 0"))
                    await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS reputation_score FLOAT DEFAULT 100"))
                    await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS reliability_score FLOAT DEFAULT 1"))
                    await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS contribution_score FLOAT DEFAULT 0"))
                    await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS trust_level VARCHAR DEFAULT 'verified'"))
                    await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS mint_address VARCHAR"))
                    await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS balance FLOAT DEFAULT 0"))
                    await conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS treasury_address VARCHAR"))
                except Exception as migrate_err:
                    logger.warning(f"Manual migration notice (likely already applied): {migrate_err}")

            logger.info("Database connection established and tables verified.")
            break
        except Exception as e:
            if i < max_retries - 1:
                logger.warning(f"Database not ready yet (Attempt {i+1}/{max_retries}). Retrying in {retry_delay}s... Error: {e}")
                await asyncio.sleep(retry_delay)
            else:
                logger.error(f"Critical: Could not connect to database after {max_retries} attempts. API may fail.")
    yield
    # Shutdown: Clean up resources if needed
    await engine.dispose()
    logger.info("Database connection closed")

app = FastAPI(title="Shoujiki API", lifespan=lifespan)

app.add_middleware(X402PaymentMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(agents_router, prefix="/agents", tags=["agents"])
app.include_router(billing_router, prefix="/billing", tags=["billing"])
app.include_router(workflows_router, prefix="/workflows", tags=["workflows"])

@app.websocket("/ws/tasks/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()
    logger.info(f"WebSocket: Client connected for task {task_id}")
    
    redis = app.state.redis
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"task:{task_id}")
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"].decode("utf-8")
                await websocket.send_text(data)
                
                # If task is finished, we can close the connection
                msg_json = json.loads(data)
                if msg_json.get("status") in ["completed", "failed"]:
                    break
    except WebSocketDisconnect:
        logger.info(f"WebSocket: Client disconnected for task {task_id}")
    finally:
        await pubsub.unsubscribe(f"task:{task_id}")
        await pubsub.close()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {
        "message": "Welcome to Shoujiki API",
        "version": "1.0.0",
        "docs": "/docs"
    }
