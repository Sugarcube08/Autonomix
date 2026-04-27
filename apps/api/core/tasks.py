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
from backend.modules.billing import service as billing_service
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

async def run_agent_task(ctx, task_id: str, agent_id: str, input_data: dict, creator_wallet: str, price: float, depth: int = 0):
    """
    AgentOS Protocol Worker: Executes agent in a Confidential VM (Arcium) 
    and generates a cryptographic Proof of Execution (PoE).
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

        # 2. Update to 'running'
        db_task.status = "running"
        await db.commit()
        await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "running"}))

        # 3. AgentOS Execution: Verifiable Compute (Arcium)
        try:
            current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
            code_hash = hashlib.sha256(json.dumps(current_ver['files']).encode()).hexdigest()
            
            # Execute in Arcium (Confidential VM)
            exec_envelope = await arcium_client.execute_confidential_task(code_hash, input_data)
            
            exec_result = exec_envelope["result"]
            poe = exec_envelope["proof_of_execution"] # The cryptographic PoE
            
            status = "completed" if exec_result["status"] == "success" else "failed"
            result_data = exec_result.get("data", "")
            
            # 4. Generate Protocol Receipt
            receipt = {
                "task_id": task_id,
                "agent_id": agent_id,
                "input_hash": hashlib.sha256(json.dumps(input_data).encode()).hexdigest(),
                "poe_signature": poe,
                "timestamp": str(asyncio.get_event_loop().time())
            }

            # 5. Update Task with PoE
            await db.execute(
                update(Task).where(Task.id == task_id).values(
                    status=status, 
                    result=json.dumps(result_data),
                    execution_receipt=receipt,
                    execution_proof_hash=poe
                )
            )
            
            # Update Agent Execution Stats
            agent.total_runs += 1
            if status == "completed":
                agent.successful_runs += 1
            
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": status, "result": result_data}))
            
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

            # 7. Protocol Settlement: Trustless Escrow release via PoE
            logger.info(f"AgentOS Protocol: Settling escrow {task_id} with PoE verification")
            await billing_service.settle_task_payment_onchain(
                task_id, db_task.user_wallet, agent.creator_wallet, status == "completed", poe
            )
            
        except Exception as e:
            logger.error(f"Worker: Critical protocol error in task {task_id}: {e}", exc_info=True)
            await db.execute(update(Task).where(Task.id == task_id).values(status="failed", result=str(e)))
            await db.commit()
            await redis_pubsub.publish(f"task:{task_id}", json.dumps({"status": "failed", "error": str(e)}))

async def run_workflow_task(ctx, run_id: str, workflow_id: str, initial_input: dict):
    """
    Background worker task to execute a multi-agent workflow.
    Implements step-by-step state tracking and idempotency.
    """
    logger.info(f"Worker: Starting workflow run {run_id} for workflow {workflow_id}")
    redis_pubsub = ctx['redis_pubsub']
    
    async with AsyncSessionLocal() as db:
        # 1. Load State & Idempotency Check
        run_res = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
        db_run = run_res.scalars().first()
        
        if not db_run or db_run.status in ["completed", "failed"]:
            logger.warning(f"Worker: Workflow run {run_id} already finished or not found. Skipping.")
            return

        db_run.status = "running"
        await db.commit()
        await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "running"}))

        # 2. Get workflow
        wf_res = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
        workflow = wf_res.scalars().first()
        if not workflow:
            logger.error(f"Worker: Workflow {workflow_id} not found")
            return

        # Initialize tracking if new
        if not db_run.completed_steps:
            db_run.completed_steps = {}
            db_run.results = {"steps": [], "initial_input": initial_input}

        # 3. Process Steps (DAG Linear Fallback for MVP)
        # Future: Resolve dependency tree for parallel execution
        for i, step in enumerate(workflow.steps):
            step_id = step.get("id", str(i))
            
            # Skip if already completed (Idempotency)
            if step_id in db_run.completed_steps:
                continue

            agent_id = step["agent_id"]
            template = step["input_template"]
            
            logger.info(f"Worker: Workflow {run_id} - Executing step {step_id} (Agent {agent_id})")
            await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({
                "status": "running", 
                "step_id": step_id, 
                "agent_id": agent_id
            }))

            try:
                agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
                agent = agent_res.scalars().first()
                if not agent: raise Exception(f"Agent {agent_id} not found")

                current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
                
                # Resolve Input: Check previous results or initial
                prev_out = db_run.results["steps"][-1]["output"] if db_run.results["steps"] else initial_input
                
                step_input = {"input": prev_out}
                if template and "{{previous_result}}" in template:
                    filled = template.replace("{{previous_result}}", str(prev_out))
                    try: step_input = json.loads(filled) if filled.strip().startswith("{") else {"input": filled}
                    except: step_input = {"input": filled}

                # AgentOS: Verifiable step execution via Arcium
                code_hash = hashlib.sha256(json.dumps(current_ver['files']).encode()).hexdigest()
                exec_envelope = await arcium_client.execute_confidential_task(code_hash, step_input)
                
                exec_result = exec_envelope["result"]
                poe = exec_envelope["proof_of_execution"]

                if exec_result["status"] != "success":
                    raise Exception(f"Agent {agent_id} execution fault")

                # Success: update tracking with Protocol PoE
                step_output = exec_result.get("data", "")
                step_data = {
                    "status": "completed",
                    "output": step_output,
                    "poe_receipt": poe
                }
                
                db_run.completed_steps[step_id] = step_data
                db_run.results["steps"].append({
                    "step_id": step_id,
                    "agent_id": agent_id,
                    "output": step_output
                })

                # Update Agent Protocol Stats
                agent.successful_runs += 1
                agent.total_runs += 1

                # Commit progress after each step (Robustness)
                await db.commit()

            except Exception as e:
                logger.error(f"Worker: Workflow {run_id} failed at step {step_id}: {e}")
                db_run.status = "failed"
                await db.commit()
                await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "failed", "error": str(e)}))
                return

        # 4. Finalize Workflow
        db_run.status = "completed"
        await db.commit()
        await redis_pubsub.publish(f"workflow:{run_id}", json.dumps({"status": "completed", "results": db_run.results}))
        logger.info(f"Worker: Workflow {run_id} finalized.")

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

class WorkerSettings:
    functions = [run_agent_task, run_workflow_task]
    redis_settings = RedisSettings(host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT, password=REDIS_PASSWORD)
    on_startup = startup
    on_shutdown = shutdown
