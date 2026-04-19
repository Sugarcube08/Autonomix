from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    code = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    creator_wallet = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    user_wallet = Column(String, nullable=False, index=True)
    input_data = Column(Text, nullable=False)
    result = Column(Text, nullable=True)
    status = Column(String, default="pending") # pending, running, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Payment(Base):
    __tablename__ = "payments"

    task_id = Column(String, ForeignKey("tasks.id"), primary_key=True)
    tx_signature = Column(String, unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="locked") # locked, released
    created_at = Column(DateTime(timezone=True), server_default=func.now())
