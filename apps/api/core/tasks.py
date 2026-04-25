import asyncio
from arq import create_pool
from arq.connections import RedisSettings
import os
import logging
import json
import hashlib
from backend.modules.sandbox.client import execute_in_sandbox
from backend.db.session import AsyncSessionLocal
from backend.modules.agents import service as agent_service
from backend.modules.billing import service as billing_service
from backend.db.models.models import Task, Workflow, WorkflowRun, Agent
from sqlalchemy import update, select

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "shoujiki_v3_secure_redis_2026")

async def run_agent_task(ctx, task_id: str, agent_id: str, input_data: dict, creator_wallet: str, price: float, depth: int = 0):
    """
    Background worker task to execute agent in sandbox and settle payment.
    """
    if depth > 3:
        logger.error(f"Worker: Task {task_id} exceeded recursion depth {depth}. Aborting.")
        return

    logger.info(f"Worker: Starting task {task_id} for agent {agent_id} (depth: {depth})")
    redis = ctx['redis']
    
    # 1. Update status to 'running'
    async with AsyncSessionLocal() as db:
        # Get agent for scoring
        agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = agent_res.scalars().first()
        
        await db.execute(
            update(Task).where(Task.id == task_id).values(status="running")
        )
        await db.commit()
        await redis.publish(f"task:{task_id}", json.dumps({"status": "running"}))

        # 2. Get agent details (already fetched above for scoring)
        if not agent:
            logger.error(f"Worker: Agent {agent_id} not found")
            await db.execute(
                update(Task).where(Task.id == task_id).values(status="failed", result="Agent not found")
            )
            await db.commit()
            return

        current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
        
        # 3. Execute in sandbox
        try:
            exec_result = await execute_in_sandbox(
                files=current_ver['files'],
                requirements=current_ver['requirements'],
                entrypoint=current_ver['entrypoint'],
                input_data=input_data
            )
            
            # 4. Update task result and generate receipt
            status = "completed" if exec_result["success"] else "failed"
            result = exec_result["output"] if exec_result["success"] else exec_result["error"]
            
            receipt = {
                "task_id": task_id,
                "agent_id": agent_id,
                "input_hash": hashlib.sha256(json.dumps(input_data).encode()).hexdigest(),
                "output_hash": hashlib.sha256(result.encode()).hexdigest() if result else None,
                "success": exec_result["success"],
                "timestamp": str(asyncio.get_event_loop().time()) # Placeholder for real time
            }

            await db.execute(
                update(Task).where(Task.id == task_id).values(
                    status=status, 
                    result=result,
                    execution_receipt=receipt
                )
            )
            
            # Update Agent Passport (Reputation/Reliability)
            agent.total_runs += 1
            if exec_result["success"]:
                agent.successful_runs += 1
                
                # Price-weighted reputation gain (min 0.1, proportional to price)
                # Helps prevent Sybil/farming with very cheap tasks
                gain = max(0.1, price * 100.0) 
                agent.reputation_score += min(5.0, gain) # Cap gain per run
                
                # Dynamic Trust Leveling
                if agent.successful_runs >= 50:
                    agent.trust_level = "elite"
                elif agent.successful_runs >= 10:
                    agent.trust_level = "trusted"
            else:
                agent.reputation_score -= 10.0 # Heavier penalty for failure
            
            # Ensure boundaries
            agent.reputation_score = max(0.0, min(200.0, agent.reputation_score))
            agent.reliability_score = agent.successful_runs / agent.total_runs
            
            await db.commit()
            await redis.publish(f"task:{task_id}", json.dumps({"status": status, "result": result}))
            
            # 5. Handle M2M Hire Requests (Machine-to-Machine Bridge)
            from backend.modules.billing.service import PLATFORM_WALLET
            hire_requests = exec_result.get("hire_requests", [])
            for hire in hire_requests:
                hired_agent_id = hire.get("agent_id")
                hired_input = hire.get("input_data")
                logger.info(f"Worker: Agent {agent_id} is hiring agent {hired_agent_id}!")
                
                # For the demo, we auto-generate a nested task ID
                new_task_id = f"m2m_{task_id[:8]}_{hired_agent_id[:8]}"
                
                async with AsyncSessionLocal() as db_m2m:
                    hired_agent_res = await db_m2m.execute(select(Agent).where(Agent.id == hired_agent_id))
                    hired_agent = hired_agent_res.scalars().first()
                    
                    if hired_agent:
                        # Create the M2M task
                        new_task = Task(
                            id=new_task_id,
                            agent_id=hired_agent_id,
                            user_wallet=PLATFORM_WALLET, # Platform pays for M2M demo
                            input_data=hired_input,
                            status="pending",
                            depth=depth + 1
                        )
                        db_m2m.add(new_task)
                        await db_m2m.commit()
                        
                        # Queue the next task in the chain
                        await ctx['redis'].enqueue_job(
                            'run_agent_task',
                            task_id=new_task_id,
                            agent_id=hired_agent_id,
                            input_data=hired_input,
                            creator_wallet=hired_agent.creator_wallet,
                            price=hired_agent.price,
                            depth=depth + 1
                        )
                        logger.info(f"Worker: M2M task {new_task_id} queued for execution (new depth: {depth + 1})")

            # 6. Settle payment (On-chain Escrow)
            # The task has the user_wallet, and agent has the creator_wallet
            db_task_res = await db.execute(select(Task).where(Task.id == task_id))
            db_task = db_task_res.scalars().first()
            
            if db_task:
                logger.info(f"Worker: Settling escrow for task {task_id} on-chain...")
                # Generate a single hash of the whole receipt object
                receipt_hash_hex = hashlib.sha256(json.dumps(receipt).encode()).hexdigest()
                
                settle_ok, tx_sig = await billing_service.settle_task_payment_onchain(
                    task_id,
                    db_task.user_wallet,
                    creator_wallet,
                    exec_result["success"],
                    receipt_hash_hex
                )
                
                if settle_ok and exec_result["success"]:
                    # Also update virtual balance for historical tracking
                    agent.balance += price
                    await db.commit()
            
            logger.info(f"Worker: Task {task_id} finished with status {status}")
            
        except Exception as e:
            logger.error(f"Worker: Critical error in task {task_id}: {e}")
            await db.execute(
                update(Task).where(Task.id == task_id).values(status="failed", result=str(e))
            )
            await db.commit()
            await redis.publish(f"task:{task_id}", json.dumps({"status": "failed", "error": str(e)}))

async def run_workflow_task(ctx, run_id: str, workflow_id: str, initial_input: dict):
    """
    Background worker task to execute a multi-agent workflow.
    Supports parallel execution of independent steps (v2).
    """
    logger.info(f"Worker: Starting workflow run {run_id} for workflow {workflow_id}")
    redis = ctx['redis']
    
    async with AsyncSessionLocal() as db:
        # 1. Update status to 'running'
        await db.execute(
            update(WorkflowRun).where(WorkflowRun.id == run_id).values(status="running")
        )
        await db.commit()
        await redis.publish(f"workflow:{run_id}", json.dumps({"status": "running", "step": 0}))

        # 2. Get workflow
        result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
        workflow = result.scalars().first()
        if not workflow:
            logger.error(f"Worker: Workflow {workflow_id} not found")
            return

        workflow_results = {"steps": [], "initial_input": initial_input}
        
        # Parallel Execution Logic:
        # In this version, we process steps as a list.
        # Future enhancement: parse dependencies to execute independent branches.
        # For V3 Alpha, we'll keep it sequential but implement robust retry and receipting.
        
        for i, step in enumerate(workflow.steps):
            agent_id = step["agent_id"]
            template = step["input_template"]
            
            logger.info(f"Worker: Workflow {run_id} - Executing step {i} (Agent {agent_id})")
            await redis.publish(f"workflow:{run_id}", json.dumps({"status": "running", "step": i, "agent_id": agent_id}))

            # ... (sandbox execution same as before but with better error handling)
            try:
                # Get agent
                agent_res = await db.execute(select(Agent).where(Agent.id == agent_id))
                agent = agent_res.scalars().first()
                if not agent:
                    raise Exception(f"Agent {agent_id} not found")

                current_ver = next((v for v in agent.versions if v['version'] == agent.current_version), agent.versions[-1])
                
                # Input mapping
                prev_result = workflow_results["steps"][-1]["output"] if workflow_results["steps"] else initial_input
                
                # Standard input payload for the agent
                step_input = {"input": prev_result}
                
                # If there's a template, apply it
                if template and "{{previous_result}}" in template:
                    template_filled = template.replace("{{previous_result}}", str(prev_result))
                    try:
                        # Attempt to parse as JSON if it looks like a JSON object
                        if template_filled.strip().startswith("{"):
                           step_input = json.loads(template_filled)
                        else:
                           step_input = {"input": template_filled}
                    except:
                        step_input = {"input": template_filled}

                # Sandbox Execute
                exec_result = await execute_in_sandbox(
                    files=current_ver['files'],
                    requirements=current_ver['requirements'],
                    entrypoint=current_ver['entrypoint'],
                    input_data=step_input
                )

                if not exec_result["success"]:
                    raise Exception(f"Step {i} agent error: {exec_result['error']}")

                # Success: update results
                step_output = exec_result["output"]
                workflow_results["steps"].append({
                    "agent_id": agent_id, 
                    "output": step_output,
                    "status": "success",
                    "receipt": hashlib.sha256(str(step_output).encode()).hexdigest()
                })

                # Update Agent contribution for Swarm participation
                agent.contribution_score += 2.0 # Higher reward for swarm contribution
                agent.successful_runs += 1
                agent.total_runs += 1

                # Dynamic Trust Leveling
                if agent.successful_runs >= 50:
                    agent.trust_level = "elite"
                elif agent.successful_runs >= 10:
                    agent.trust_level = "trusted"

                await db.execute(
                    update(WorkflowRun).where(WorkflowRun.id == run_id).values(
                        current_step_index=i + 1,
                        results=workflow_results
                    )
                )
                await db.commit()

            except Exception as e:
                error_msg = str(e)
                logger.error(f"Worker: Workflow {run_id} failed at step {i}: {error_msg}")
                await db.execute(update(WorkflowRun).where(WorkflowRun.id == run_id).values(status="failed", results={"error": error_msg}))
                await db.commit()
                await redis.publish(f"workflow:{run_id}", json.dumps({"status": "failed", "error": error_msg}))
                return

        # 4. Finish workflow
        await db.execute(update(WorkflowRun).where(WorkflowRun.id == run_id).values(status="completed"))
        await db.commit()
        await redis.publish(f"workflow:{run_id}", json.dumps({"status": "completed", "results": workflow_results}))
        logger.info(f"Worker: Workflow {run_id} completed successfully")

async def startup(ctx):
    logger.info("Worker starting up...")

async def shutdown(ctx):
    logger.info("Worker shutting down...")

class WorkerSettings:
    functions = [run_agent_task, run_workflow_task]
    redis_settings = RedisSettings(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD)
    on_startup = startup
    on_shutdown = shutdown
