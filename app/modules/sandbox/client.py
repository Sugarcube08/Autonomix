import httpx
from app.core.config import SANDBOX_URL
import json

async def execute_in_sandbox(files: dict, requirements: list, entrypoint: str, input_data: dict):
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{SANDBOX_URL}/execute",
                json={
                    "files": files,
                    "requirements": requirements,
                    "entrypoint": entrypoint,
                    "input_data": json.dumps(input_data)
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {
                "success": False,
                "output": "",
                "error": f"Sandbox connection error: {str(e)}"
            }
