import subprocess
import tempfile
import os
import json
import resource

def set_limits():
    # Limit memory to 256MB
    mem_limit = 256 * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (mem_limit, mem_limit))
    # Limit CPU time to 10 seconds
    resource.setrlimit(resource.RLIMIT_CPU, (10, 10))
    # Limit file size to 2MB
    resource.setrlimit(resource.RLIMIT_FSIZE, (2 * 1024 * 1024, 2 * 1024 * 1024))
    # Limit number of processes to 20
    resource.setrlimit(resource.RLIMIT_NPROC, (20, 20))

def run_agent_code(files: dict, requirements: list, entrypoint: str, input_data: str):
    # Dynamic dependency installation is disabled for security. 
    if requirements:
        print(f"Note: Ignoring dynamic requirements {requirements}. Using pre-installed environment.")

    with tempfile.TemporaryDirectory() as tmpdir:
        # 1. Write files
        for filename, content in files.items():
            file_path = os.path.join(tmpdir, filename)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w") as f:
                f.write(content)
        
        # 2. Write requirements.txt (for reference only)
        req_path = os.path.join(tmpdir, "requirements.txt")
        with open(req_path, "w") as f:
            f.write("\n".join(requirements))
        
        # 3. Create input file
        in_path = os.path.join(tmpdir, "input.json")
        with open(in_path, "w") as f:
            f.write(input_data)
        
        # 4. Generate wrapper and internal shoujiki module
        shoujiki_module = """
import json
import os

class Shoujiki:
    def hire_agent(self, agent_id, input_data):
        # This is a bridge. It writes a request to a specific file 
        # that the runner will detect and fulfill.
        request = {
            "type": "hire",
            "agent_id": agent_id,
            "input_data": input_data
        }
        with open('hire_request.json', 'w') as f:
            f.write(json.dumps(request))
        
        return {"status": "requested", "note": "Machine-to-machine loop initiated"}

shoujiki = Shoujiki()
"""
        with open(os.path.join(tmpdir, "shoujiki.py"), "w") as f:
            f.write(shoujiki_module)

        module_name = entrypoint.replace(".py", "").replace("/", ".")
        wrapper_code = f"""
import json
import sys
import os
import importlib

# Add current dir to path
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
            # 5. Execute in isolated environment
            # Try Bubblewrap (Hardened) -> Try Unshare (Network) -> Fallback (Standard)
            
            # Tier 1: Bubblewrap
            bwrap_command = [
                "bwrap",
                "--ro-bind", "/usr", "/usr",
                "--symlink", "usr/bin", "/bin",
                "--symlink", "usr/lib", "/lib",
                "--symlink", "usr/lib64", "/lib64",
                "--symlink", "usr/sbin", "/sbin",
                "--dir", "/tmp",
                "--proc", "/proc",
                "--dev", "/dev",
                "--unshare-all",
                "--hostname", "shoujiki-sandbox",
                "--bind", tmpdir, "/app",
                "--chdir", "/app",
                "python3", "wrapper.py"
            ]
            
            process = None
            try:
                process = subprocess.run(
                    bwrap_command,
                    capture_output=True,
                    text=True,
                    timeout=15,
                    preexec_fn=set_limits
                )
                if process.returncode != 0 and ("bwrap" in process.stderr or "Operation not permitted" in process.stderr):
                    raise PermissionError("bwrap failed")
            except (PermissionError, FileNotFoundError, subprocess.SubprocessError):
                # Tier 2: Unshare
                print("WARNING: Bubblewrap failed or not permitted. Trying unshare...")
                unshare_command = ["unshare", "-n", "python3", "wrapper.py"]
                try:
                    process = subprocess.run(
                        unshare_command,
                        cwd=tmpdir,
                        capture_output=True,
                        text=True,
                        timeout=15,
                        preexec_fn=set_limits
                    )
                    if process.returncode != 0 and ("unshare" in process.stderr or "Operation not permitted" in process.stderr):
                        raise PermissionError("unshare failed")
                except (PermissionError, FileNotFoundError, subprocess.SubprocessError):
                    # Tier 3: Standard Fallback
                    print("WARNING: All isolation failed. Falling back to standard execution.")
                    fallback_command = ["python3", "wrapper.py"]
                    process = subprocess.run(
                        fallback_command,
                        cwd=tmpdir,
                        capture_output=True,
                        text=True,
                        timeout=15,
                        preexec_fn=set_limits
                    )
            
            MAX_OUTPUT_SIZE = 100000
            stdout = process.stdout[:MAX_OUTPUT_SIZE]
            stderr = process.stderr[:MAX_OUTPUT_SIZE]
            
            result = ""
            if "---RESULT_START---" in stdout:
                parts = stdout.split("---RESULT_START---")
                if len(parts) > 1 and "---RESULT_END---" in parts[1]:
                    result = parts[1].split("---RESULT_END---")[0].strip()
            
            # 7. Check for M2M hire requests
            hire_requests = []
            hire_req_path = os.path.join(tmpdir, "hire_request.json")
            if os.path.exists(hire_req_path):
                try:
                    with open(hire_req_path, 'r') as f:
                        data = json.load(f)
                        if isinstance(data, dict):
                            hire_requests.append(data)
                except:
                    pass

            return process.returncode == 0, result, stderr, hire_requests
        except subprocess.TimeoutExpired:
            return False, "", "Execution timed out", []
        except Exception as e:
            return False, "", str(e), []
