import ast

def validate_agent_code(code: str):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"Syntax error in agent code: {e}"

    has_agent_class = False
    has_run_method = False

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == "Agent":
            has_agent_class = True
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and item.name == "run":
                    # Check if it has the right arguments (self, input_data)
                    args = [arg.arg for arg in item.args.args]
                    if len(args) >= 2: # self and at least one other arg
                        has_run_method = True
                    else:
                        return False, "Agent.run() method must accept (self, input_data)"

    if not has_agent_class:
        return False, "Code must define a class named 'Agent'"
    if not has_run_method:
        return False, "Class 'Agent' must define a 'run(self, input_data)' method"

    return True, "Success"
