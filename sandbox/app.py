from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from runner import run_agent_code

app = FastAPI()

from typing import Dict, List

class ExecutionRequest(BaseModel):
    files: Dict[str, str]
    requirements: List[str]
    entrypoint: str
    input_data: str # JSON string

@app.post("/execute")
async def execute(req: ExecutionRequest):
    try:
        success, output, error = run_agent_code(
            files=req.files,
            requirements=req.requirements,
            entrypoint=req.entrypoint,
            input_data=req.input_data
        )
        return {
            "success": success,
            "output": output,
            "error": error
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": str(e)
        }
