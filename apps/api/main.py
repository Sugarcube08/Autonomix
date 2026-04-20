from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.db.session import engine, Base, get_db
from sqlalchemy.ext.asyncio import AsyncSession
from backend.modules.auth.routes import router as auth_router
from backend.modules.agents.routes import router as agents_router
from backend.modules.marketplace.routes import router as marketplace_router
from backend.modules.billing.routes import router as billing_router
from backend.modules.auth.middleware import X402PaymentMiddleware
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    try:
        async with engine.begin() as conn:
            # Import models here to ensure they are registered
            from backend.db.models.models import Agent, Task, Payment
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
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
app.include_router(marketplace_router, prefix="/marketplace", tags=["marketplace"])
app.include_router(billing_router, prefix="/billing", tags=["billing"])

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected", "error": str(e)},
        )

@app.get("/")
async def root():
    return {
        "message": "Welcome to Shoujiki API",
        "version": "1.0.0",
        "docs": "/docs"
    }
