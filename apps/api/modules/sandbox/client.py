import httpx
from backend.core.config import SANDBOX_URL
import json

async def execute_in_sandbox(files: dict, requirements: list, entrypoint: str, input_data: dict):
    # Try configured URL first
    urls = [SANDBOX_URL, "http://localhost:8001", "http://sandbox:8001"]
    
    # Remove duplicates while preserving order
    unique_urls = []
    for u in urls:
        if u not in unique_urls:
            unique_urls.append(u)

    last_error = ""
    for url in unique_urls:
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{url}/execute",
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
                last_error = str(e)
                continue
                
    return {
        "success": False,
        "output": "",
        "error": f"Sandbox unreachable (tried {len(unique_urls)} endpoints). Last error: {last_error}"
    }
