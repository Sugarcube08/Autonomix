from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from backend.db.session import Base

class UserWallet(Base):
    __tablename__ = "user_wallets"

    wallet_address = Column(String, primary_key=True, index=True)
    balance = Column(Float, nullable=False, default=0.0)
    
    # Allowance Configuration: { agent_id: limit_amount }
    allowances = Column(JSON, nullable=False, default={})
    
    # Auto Top-Up Configuration
    auto_topup_enabled = Column(Boolean, default=False)
    auto_topup_threshold = Column(Float, default=1.0) # SOL
    auto_topup_amount = Column(Float, default=2.0)    # SOL

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

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
    
    # Financials (Internal Ledger before final settlement/withdrawal)
    balance = Column(Float, nullable=False, default=0.0)
    total_earnings = Column(Float, nullable=False, default=0.0)

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
    poae_hash = Column(String, nullable=True) # Proof of Autonomous Execution (VACN)

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

class MarketOrder(Base):
    __tablename__ = "market_orders"

    id = Column(String, primary_key=True, index=True)
    creator_wallet = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    budget = Column(Float, nullable=False)
    required_skills = Column(JSON, nullable=False, default=[])
    status = Column(String, default="open") # open, bidding_closed, active, completed, cancelled
    selected_bid_id = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Bid(Base):
    __tablename__ = "bids"

    id = Column(String, primary_key=True, index=True)
    order_id = Column(String, ForeignKey("market_orders.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    proposal = Column(Text, nullable=True)
    status = Column(String, default="pending") # pending, accepted, rejected
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    reporter_wallet = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    evidence = Column(JSON, nullable=True)
    status = Column(String, default="open") # open, investigating, resolved, dismissed
    resolution_details = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AgentCredit(Base):
    __tablename__ = "agent_credits"

    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True)
    credit_score = Column(Float, default=500.0) # 300 - 850 range (FICO-like for agents)
    credit_limit = Column(Float, default=0.0) # Max SOL borrowable
    utilization = Column(Float, default=0.0)
    repayment_history = Column(JSON, default=[]) # List of repayments
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AgentLoan(Base):
    __tablename__ = "agent_loans"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    lender_wallet = Column(String, nullable=False) # Can be protocol or another agent
    principal = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False) # Annualized %
    term_days = Column(Float, nullable=False)
    balance_remaining = Column(Float, nullable=False)
    status = Column(String, default="active") # active, repaid, defaulted
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    due_at = Column(DateTime(timezone=True), nullable=False)

class AgentBond(Base):
    __tablename__ = "agent_bonds"

    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    purpose = Column(String, nullable=False) # e.g., "high_value_task_guarantee"
    status = Column(String, default="locked") # locked, released, slashed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    locked_until = Column(DateTime(timezone=True), nullable=True)

class ProtocolProposal(Base):
    __tablename__ = "protocol_proposals"

    id = Column(String, primary_key=True, index=True)
    proposer_wallet = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    parameter_change = Column(JSON, nullable=True) # e.g., {"fee_ratio": 0.05}
    status = Column(String, default="active") # active, passed, defeated, executed
    
    votes_for = Column(Float, default=0.0)
    votes_against = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)

class ExecutorStake(Base):
    __tablename__ = "executor_stakes"

    executor_id = Column(String, primary_key=True, index=True)
    wallet_address = Column(String, nullable=False, index=True)
    amount_staked = Column(Float, nullable=False)
    reputation_score = Column(Float, default=100.0)
    status = Column(String, default="active") # active, jailed, slashed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
