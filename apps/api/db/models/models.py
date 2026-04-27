from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from backend.db.session import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    versions = Column(JSON, nullable=False, default=[]) # List of {version, files, requirements, entrypoint}
    current_version = Column(String, nullable=False, default="v1")
    price = Column(Float, nullable=False)
    creator_wallet = Column(String, nullable=False, index=True)
    mint_address = Column(String, nullable=True, index=True) # Metaplex Core Asset Address
    
    # Execution Stats
    total_runs = Column(Float, nullable=False, default=0)
    successful_runs = Column(Float, nullable=False, default=0)
    
    # Protocol Integration Fields (AgentOS Level-Up)
    world_id_hash = Column(String, nullable=True) # World ID: Proof of human for creator
    squads_vault_pda = Column(String, nullable=True) # Squads V4: Agent's sovereign treasury
    credential_registry_address = Column(String, nullable=True) # W3C Attestations / On-chain Identity Graph

    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    user_wallet = Column(String, nullable=False, index=True)
    input_data = Column(Text, nullable=False)
    result = Column(Text, nullable=True)
    status = Column(String, default="queued") # queued, running, completed, failed, settled
    depth = Column(Float, default=0)
    
    # Protocol Fields
    escrow_pda = Column(String, nullable=True)
    settlement_signature = Column(String, nullable=True)
    execution_receipt = Column(JSON, nullable=True) 
    execution_proof_hash = Column(String, nullable=True) # Arcium / TEE Cryptographic Proof of Execution

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Payment(Base):
    __tablename__ = "payments"

    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    tx_signature = Column(String, unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="locked") # locked, released
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    creator_wallet = Column(String, nullable=False, index=True)
    # List of {id, agent_id, input_template, depends_on: [id]}
    steps = Column(JSON, nullable=False) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id = Column(String, primary_key=True, index=True)
    workflow_id = Column(String, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    user_wallet = Column(String, nullable=False, index=True)
    status = Column(String, default="queued") # queued, running, completed, failed
    
    # DAG Tracking
    # List of {step_id: {status, result, receipt}}
    completed_steps = Column(JSON, nullable=True, default={})
    results = Column(JSON, nullable=True) 

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
