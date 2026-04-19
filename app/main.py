from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.modules.auth.routes import router as auth_router
from app.modules.agents.routes import router as agents_router
from app.modules.marketplace.routes import router as marketplace_router

app = FastAPI(title="Shoujiki API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        # Import models here to ensure they are registered
        from app.db.models.models import Agent, Task, Payment
        await conn.run_sync(Base.metadata.create_all)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(agents_router, prefix="/agents", tags=["agents"])
app.include_router(marketplace_router, prefix="/marketplace", tags=["marketplace"])

@app.get("/")
async def root():
    return {"message": "Welcome to Shoujiki API"}
