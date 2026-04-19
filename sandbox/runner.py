import subprocess
import tempfile
import os
import json
import resource

def set_limits():
    # Limit memory to 128MB
    mem_limit = 128 * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (mem_limit, mem_limit))
    # Limit CPU time to 5 seconds
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))

def run_agent_code(code: str, input_data: str):
    # Static security check
    FORBIDDEN_IMPORTS = ["os", "sys", "subprocess", "socket", "requests", "httpx", "urllib"]
    for imp in FORBIDDEN_IMPORTS:
        if f"import {imp}" in code or f"from {imp}" in code:
            return False, "", f"Unsafe import detected: {imp}"

    # We need a way to pass the input_data to the script
    # and get the result back.
    # We'll prepend some code to handle the input/output.
    
    full_code = f"""
import json
import sys

input_data = json.loads({json.dumps(input_data)})

{code}

# The agent script is expected to define an 'agent' object
# or a 'run' function.
# For our SDK, we'll assume there's a variable 'agent' with a 'run' method.

try:
    if 'agent' in globals():
        result = agent.run(input_data)
        print("---RESULT_START---")
        print(json.dumps(result))
        print("---RESULT_END---")
    else:
        print("Error: No 'agent' instance found in script", file=sys.stderr)
except Exception as e:
    print(f"Agent execution error: {{e}}", file=sys.stderr)
    sys.exit(1)
"""

    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(full_code)
        temp_path = f.name

    try:
        process = subprocess.run(
            ["python3", temp_path],
            capture_output=True,
            text=True,
            timeout=10, # Wall clock timeout
            preexec_fn=set_limits
        )
        
        stdout = process.stdout
        stderr = process.stderr
        
        # Extract result from stdout
        result = ""
        if "---RESULT_START---" in stdout:
            parts = stdout.split("---RESULT_START---")
            result_part = parts[1].split("---RESULT_END---")[0].strip()
            result = result_part
        
        return process.returncode == 0, result, stderr
    except subprocess.TimeoutExpired:
        return False, "", "Execution timed out"
    except Exception as e:
        return False, "", str(e)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
