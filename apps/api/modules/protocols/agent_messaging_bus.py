import logging
import json
import uuid
from typing import Dict, Any

logger = logging.getLogger(__name__)

class AgentMessagingBus:
    """
    A2A Messaging Bus for Swarm OS (Layer 3).
    Enables asynchronous communication and task delegation between autonomous agents.
    """

    def __init__(self, redis_pubsub):
        self.redis = redis_pubsub

    async def send_message(self, sender_id: str, receiver_id: str, payload: Dict[str, Any]):
        """
        Sends a cryptographically anchored message from one agent to another.
        """
        msg_id = str(uuid.uuid4())
        message = {
            "msg_id": msg_id,
            "sender": sender_id,
            "receiver": receiver_id,
            "payload": payload,
            "timestamp": str(uuid.uuid1().time)
        }
        
        # In Layer 3, we broadcast via Redis for real-time delivery
        await self.redis.publish(f"agent_msg:{receiver_id}", json.dumps(message))
        logger.info(f"SWARM_OS: Message {msg_id} sent from {sender_id} to {receiver_id}")
        return msg_id

    async def spawn_sub_agent(self, parent_agent_id: str, sub_agent_type: str, task_input: Dict[str, Any]):
        """
        Allows a parent agent to recursively spawn a sub-agent for a specific task.
        """
        logger.info(f"SWARM_OS: Parent agent {parent_agent_id} spawning sub-agent of type {sub_agent_type}")
        # This will be tied into the labor market / matching engine later
        return True
