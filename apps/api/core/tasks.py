import hashlib
import json
import asyncio
import logging
import uuid
import os
from arq import create_pool
from arq.connections import RedisSettings
from backend.modules.protocols.arcium_client import ArciumClient
from backend.modules.protocols.squads_client import SquadsClient
from backend.modules.protocols.switchboard_client import SwitchboardClient
from backend.modules.billing import service as billing_service
from backend.modules.billing import treasury_service
from backend.db.models.models import Task, Workflow, WorkflowRun, Agent
from sqlalchemy import update, select
from backend.db.session import AsyncSessionLocal

from backend.core.config import (
    REDIS_QUEUE_HOST, REDIS_QUEUE_PORT, 
    REDIS_PUBSUB_HOST, REDIS_PUBSUB_PORT, 
    REDIS_PASSWORD
)

logger = logging.getLogger(__name__)

arcium_client = ArciumClient()
squads_client = SquadsClient()
switchboard_client = SwitchboardClient()

async def run_agent_task(ctx, task_id: str, agent_id: str, input_data: dict, creator_wallet: str, price: float, depth: int = 0):
    """
    VACN Protocol Worker: Executes agent in a Confidential VM (Arcium) 
    and generates a cryptographic Proof of Autonomous Execution (PoAE).
    """
    if depth > 3:
        logger.error(f"Worker: Task {task_id} exceeded recursion depth {depth}. Aborting.")
        return

    logger.info(f"Worker: Starting AgentOS task {task_id} (depth: {depth})")
    redis_pubsub = ctx['redis_pubsub']
    
    async with AsyncSessionLocal() as db:
        # 1. Load Task State
        task_res = await db.execute(select(Task).where(Task.id == task_id))
        db_task = task_res.scalars().first()
        
        if not db_task or db_task.status in ["completed", "failed", "settled"]:
            logger.warning(f"Worker: Task {task_id} skipping (state: {db_task.status if db_task else 'not found'})")
            return

        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        
        if not agent:
            logger.error(f"Worker: Agent {agent_id} not found")
            return

        # 2. Wallet OS Layer 2: Auto Fee Deduction (RFC-002)
        # Attempt to deduct fee from user's app-level wallet
        fee_deducted = await treasury_service.check_and_deduct_fee(
            db, db_task.user_wallet, agent.id, agent.price
        )
        if not fee_deducted:
            logger.warning(f"Worker: Task {task_id} aborted - Insufficient App Wallet balance for user {db_task.user_wallet}")
            db_task.status = "failed"
            db_task.result = "Insufficient App Wallet balance (Wallet OS L2)"
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({
                "status": "failed", 
                "error": "Insufficient App Wallet balance. Please top up your AgentOS account."
            }))
            return

        # 3. Update to 'running'
        db_task.status = "running"
        await db.commit()
        await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "running"}))

        # 3. VACN Execution: Verifiable Compute (Arcium)
        try:
            current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
            
            # Execute in Arcium (Confidential VM / WASM)
            exec_envelope = await arcium_client.execute_confidential_task(
                agent.id, 
                current_ver['files'], 
                input_data
            )
            
            exec_result = exec_envelope["result"]
            poae = exec_envelope["proof_of_autonomous_execution"] # The cryptographic PoAE
            
            status = "completed" if exec_result["status"] == "success" else "failed"
            result_data = exec_result.get("data", "")
            
            # 4. Generate Protocol Receipt
            receipt = {
                "task_id": task_id,
                "agent_id": agent_id,
                "input_hash": hashlib.sha256(json.dumps(input_data).encode()).hexdigest(),
                "poae_signature": poae,
                "timestamp": str(asyncio.get_event_loop().time())
            }

            # 5. Update Task with PoAE
            await db.execute(
                update(Task).where(Task.id == task_id).values(
                    status=status, 
                    result=json.dumps(result_data),
                    execution_receipt=receipt,
                    poae_hash=poae
                )
            )
            
            # Update Agent Execution Stats
            agent.total_runs += 1
            if status == "completed":
                agent.successful_runs += 1
                # Wallet OS: Record earnings in agent's internal ledger
                await treasury_service.record_agent_earnings(db, agent.id, agent.price)
            
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({
                "status": status, 
                "result": result_data,
                "poae_hash": poae
            }))
            
            # 6. AgentOS Machine Economy: True M2M Hiring via Squads
            hire_requests = exec_result.get("hire_requests", [])
            for hire in hire_requests:
                hired_id = hire.get("agent_id")
                hired_input = hire.get("input_data")
                new_task_id = f"m2m_{task_id[:8]}_{uuid.uuid4().hex[:6]}"
                
                if agent.squads_vault_pda:
                    signed_ok = await squads_client.sign_m2m_escrow(agent.squads_vault_pda, hired_id, 0.01)
                    if signed_ok:
                        await ctx['redis_queue'].enqueue_job(
                            'run_agent_task',
                            task_id=new_task_id,
                            agent_id=hired_id,
                            input_data=hired_input,
                            creator_wallet=agent.creator_wallet,
                            price=0.01,
                            depth=depth + 1
                        )

            # 7. Protocol Verification: Request Switchboard Oracle to verify PoAE
            logger.info(f"VACN Protocol: Submitting PoAE to Switchboard for task {task_id}")
            sb_tx = await switchboard_client.create_verification_request(task_id, poae)
            
            # 8. Protocol Settlement: Propose outcome on-chain (Submit PoAE)
            logger.info(f"VACN Protocol: Proposing settlement for escrow {task_id} via PoAE submission")
            settle_ok, tx_sig = await billing_service.settle_task_payment_onchain(
                task_id, db_task.user_wallet, agent.creator_wallet, status == "completed", poae
            )
            
            if settle_ok:
                # Update status to verifying
                db_task.status = "verifying"
                db_task.settlement_signature = tx_sig
                await db.commit()
                await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "verifying", "challenge_sig": tx_sig}))

        except Exception as e:
            logger.error(f"Worker: Critical protocol error in task {task_id}: {e}", exc_info=True)
            await db.execute(update(Task).where(Task.id == task_id).values(status="failed", result=str(e)))
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "failed", "error": str(e)}))

async def finalize_vacn_settlements(ctx):
    """
    Cron-like task to finalize optimistic settlements.
    In Phase 3, this moves tasks from 'verifying' to 'settled'.
    """
    logger.info("VACN_FINALIZER: Scanning for matured challenge periods...")
    async with AsyncSessionLocal() as db:
        # Find tasks in 'verifying' status
        res = await db.execute(select(Task).where(Task.status == "verifying"))
        matured_tasks = res.scalars().all()
        
        for task in matured_tasks:
            logger.info(f"VACN_FINALIZER: Finalizing task {task.id}")
            
            # Protocol Call: Finalize on-chain
            agent_res = await db.execute(select(Agent).where(Agent.id == task.agent_id))
            agent = agent_res.scalars().first()
            
            if agent:
                ok, tx_sig = await billing_service.finalize_task_settlement(
                    task.id, task.user_wallet, agent.creator_wallet
                )
                if ok:
                    task.status = "settled"
                    task.settlement_signature = tx_sig
                    await db.commit()
                    logger.info(f"VACN_FINALIZER: Task {task.id} finalized. Sig: {tx_sig}")

async def process_market_matching(ctx):
    """
    Cron-like task to run the Labor Market Matching Engine.
    Simulates autonomous agents detecting and bidding on open orders.
    """
    logger.info("MARKET_ENGINE: Scanning for new labor opportunities...")
    from backend.modules.marketplace.matching_engine import MatchingEngine
    engine = MatchingEngine()
    
    async with AsyncSessionLocal() as db:
        # Get all open orders
        res = await db.execute(select(MarketOrder).where(MarketOrder.status == "open"))
        orders = res.scalars().all()
        
        for order in orders:
            await engine.trigger_autonomous_bidding(db, order.id)

async def run_workflow_task(ctx, run_id: str, workflow_id: str, initial_input: dict):
    """
    Swarm OS Orchestrator (Layer 3): Manages a DAG of agents.
    Dispatches independent steps in parallel and tracks dependency resolution.
    """
    logger.info(f"SWARM_OS: Orchestrating workflow run {run_id}")
    redis_pubsub = ctx['redis_pubsub']
    
    async with AsyncSessionLocal() as db:
        # 1. Load State
        run_res = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        db_run = run_res.scalars().first()
        if not db_run or db_run.status in ["completed", "failed"]:
            return

        wf_res = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
        workflow = wf_res.scalars().first()
        if not workflow: return

        # Initialize tracking
        if not db_run.completed_steps:
            db_run.completed_steps = {}
            db_run.results = {"steps": [], "initial_input": initial_input}
            db_run.status = "running"
            await db.commit()

        # 2. Determine Ready Steps
        # A step is 'ready' if its depends_on list is satisfied by completed_steps
        ready_steps = []
        all_completed = True
        
        for step in workflow.steps:
            step_id = step.get("id")
            if step_id in db_run.completed_steps:
                continue
            
            all_completed = False
            depends_on = step.get("depends_on", [])
            
            # Check if dependencies are met
            deps_satisfied = all(dep_id in db_run.completed_steps for dep_id in depends_on)
            
            # Check if currently being executed (not yet completed but enqueued)
            # We use Redis to track 'in_flight' steps for this run
            in_flight = await ctx['redis_queue'].redis.get(f"wf_flight:{run_id}:{step_id}")
            
            if deps_satisfied and not in_flight:
                ready_steps.append(step)

        # 3. Dispatch Ready Steps
        if ready_steps:
            for step in ready_steps:
                step_id = step.get("id")
                # Mark as in-flight
                await ctx['redis_queue'].redis.setex(f"wf_flight:{run_id}:{step_id}", 300, "1")
                
                await ctx['redis_queue'].enqueue_job(
                    'run_workflow_step_task',
                    run_id=run_id,
                    workflow_id=workflow_id,
                    step=step,
                    initial_input=initial_input
                )
            logger.info(f"SWARM_OS: Dispatched {len(ready_steps)} parallel steps for run {run_id}")
        
        elif all_completed:
            # 4. Finalize Swarm
            db_run.status = "completed"
            await db.commit()
            await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "completed", "results": db_run.results}))
            logger.info(f"SWARM_OS: Swarm run {run_id} finalized.")

async def run_workflow_step_task(ctx, run_id: str, workflow_id: str, step: dict, initial_input: dict):
    """
    Executes a single node within a Swarm OS DAG.
    """
    step_id = step["id"]
    agent_id = step["agent_id"]
    template = step["input_template"]
    
    logger.info(f"SWARM_OS: Executing swarm node {step_id} (Agent {agent_id})")
    redis_pubsub = ctx['redis_pubsub']

    async with AsyncSessionLocal() as db:
        run_res = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        db_run = run_res.scalars().first()
        if not db_run: return

        try:
            agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
            agent = agent_res.scalars().first()
            if not agent: raise Exception("Agent not found")

            # 1. Resolve Input from dependencies
            depends_on = step.get("depends_on", [])
            if not depends_on:
                prev_out = initial_input
            else:
                # Aggregate outputs from all listed dependencies
                prev_out = {dep_id: db_run.completed_steps[dep_id]["output"] for dep_id in depends_on}

            step_input = {"input": prev_out}
            if template and "{{previous_result}}" in template:
                # Simple single-dependency fallback for legacy templates
                val = list(prev_out.values())[0] if isinstance(prev_out, dict) else prev_out
                filled = template.replace("{{previous_result}}", str(val))
                try: step_input = json.loads(filled)
                except: step_input = {"input": filled}

            # 2. VACN: Verifiable compute
            current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
            exec_envelope = await arcium_client.execute_confidential_task(
                agent.id, current_ver['files'], step_input
            )
            
            exec_result = exec_envelope["result"]
            poae = exec_envelope["proof_of_autonomous_execution"]

            if exec_result["status"] != "success":
                raise Exception(f"Node fault: {exec_result.get('error')}")

            # 3. Commit Step Completion
            step_output = exec_result.get("data", "")
            
            # Using copy to avoid mutation issues with JSON columns
            completed = dict(db_run.completed_steps)
            completed[step_id] = {
                "status": "completed",
                "output": step_output,
                "poae_receipt": poae
            }
            db_run.completed_steps = completed
            
            results = dict(db_run.results)
            results["steps"].append({
                "step_id": step_id,
                "agent_id": agent_id,
                "output": step_output
            })
            db_run.results = results
            
            # Update Node Stats
            agent.successful_runs += 1
            agent.total_runs += 1
            await db.commit()

            # 4. Trigger Orchestrator to check for next ready steps
            await ctx['redis_queue'].redis.delete(f"wf_flight:{run_id}:{step_id}")
            await ctx['redis_queue'].enqueue_job('run_workflow_task', run_id=run_id, workflow_id=workflow_id, initial_input=initial_input)

        except Exception as e:
            logger.error(f"SWARM_OS: Node {step_id} failed: {e}")
            db_run.status = "failed"
            await db.commit()
            await ctx['redis_queue'].redis.delete(f"wf_flight:{run_id}:{step_id}")
            await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "failed", "error": str(e), "step_id": step_id}))

async def startup(ctx):
    logger.info("Worker starting up...")
    ctx['redis_queue'] = await create_pool(RedisSettings(
        host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT, password=REDIS_PASSWORD
    ))
    ctx['redis_pubsub'] = await create_pool(RedisSettings(
        host=REDIS_PUBSUB_HOST, port=REDIS_PUBSUB_PORT, password=REDIS_PASSWORD
    ))
    logger.info("Worker: Redis connections initialized: Queue and PubSub isolated.")

async def shutdown(ctx):
    logger.info("Worker shutting down...")
    await ctx['redis_queue'].close()
    await ctx['redis_pubsub'].close()

from arq import cron

class WorkerSettings:
    functions = [run_agent_task, run_workflow_task, run_workflow_step_task, finalize_vacn_settlements, process_market_matching]
    cron_jobs = [
        cron(finalize_vacn_settlements, minute=None, second=0), # Run every minute
        cron(process_market_matching, minute=None, second=30)  # Run every minute (offset by 30s)
    ]
    redis_settings = RedisSettings(host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT, password=REDIS_PASSWORD)
    on_startup = startup
    on_shutdown = shutdown
wn
