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

def run_agent_code(files: dict, requirements: list, entrypoint: str, input_data: str):
    with tempfile.TemporaryDirectory() as tmpdir:
        # 1. Write files
        for filename, content in files.items():
            file_path = os.path.join(tmpdir, filename)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w") as f:
                f.write(content)
        
        # 2. Write requirements.txt and install dependencies
        req_path = os.path.join(tmpdir, "requirements.txt")
        with open(req_path, "w") as f:
            f.write("\n".join(requirements))
        
        # Install to a local deps folder to stay isolated
        deps_path = os.path.join(tmpdir, ".deps")
        if requirements:
            subprocess.run(
                ["pip", "install", "-r", "requirements.txt", "-t", ".deps"],
                cwd=tmpdir,
                capture_output=True
            )
        
        # 3. Create input file
        in_path = os.path.join(tmpdir, "input.json")
        with open(in_path, "w") as f:
            f.write(input_data)
        
        # 4. Generate wrapper to run the agent
        # The entrypoint is assumed to be a python file that defines a class or instantiates 'agent'
        # We'll use a more robust way to find the agent instance.
        module_name = entrypoint.replace(".py", "").replace("/", ".")
        wrapper_code = f"""
import json
import sys
import os
import importlib

# Add deps and current dir to path
sys.path.insert(0, os.path.abspath(".deps"))
sys.path.insert(0, os.path.abspath("."))

try:
    with open('input.json', 'r') as f:
        input_data = json.load(f)

    # Import the entrypoint module
    module = importlib.import_module('{module_name}')
    
    # Look for 'agent' instance in the module
    agent = getattr(module, 'agent', None)
    
    if not agent:
        # Try to find any class with a run method and instantiate it
        for name in dir(module):
            obj = getattr(module, name)
            if isinstance(obj, type) and hasattr(obj, 'run'):
                agent = obj()
                break
                
    if agent and hasattr(agent, 'run'):
        result = agent.run(input_data)
        print("---RESULT_START---")
        print(json.dumps(result))
        print("---RESULT_END---")
    else:
        print("Error: No agent with 'run(self, data)' method found in {entrypoint}", file=sys.stderr)
        sys.exit(1)
except Exception as e:
    import traceback
    print(f"Agent execution error: {{e}}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
"""
        wrapper_path = os.path.join(tmpdir, "wrapper.py")
        with open(wrapper_path, "w") as f:
            f.write(wrapper_code)

        try:
            process = subprocess.run(
                ["python3", "wrapper.py"],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=20, # Increased timeout for multi-file/deps
                preexec_fn=set_limits
            )
            
            MAX_OUTPUT_SIZE = 50000
            stdout = process.stdout[:MAX_OUTPUT_SIZE]
            stderr = process.stderr[:MAX_OUTPUT_SIZE]
            
            result = ""
            if "---RESULT_START---" in stdout:
                parts = stdout.split("---RESULT_START---")
                if len(parts) > 1 and "---RESULT_END---" in parts[1]:
                    result = parts[1].split("---RESULT_END---")[0].strip()
            
            return process.returncode == 0, result, stderr
        except subprocess.TimeoutExpired:
            return False, "", "Execution timed out"
        except Exception as e:
            return False, "", str(e)
