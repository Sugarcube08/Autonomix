# 🧱 SHOUJIKI — CODE-LEVEL ARCHITECTURE

> ⚡ Monolith-first, containerized, execution-safe

---

# 🗂️ 1. PROJECT STRUCTURE (FINAL)

```text
shoujiki/# 🧱 SHOUJIKI — CODE-LEVEL ARCHITECTURE

> ⚡ Monolith-first, containerized, execution-safe

---


│
├── app/
│   ├── main.py                # FastAPI entrypoint
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py       # JWT + wallet verify
│   │   └── dependencies.py
│   │
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py
│   │   └── models/
│   │       ├── agent.py
│   │       ├── task.py
│   │       └── payment.py
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   │
│   │   ├── agents/
│   │   │   ├── routes.py
│   │   │   ├── service.py
│   │   │   └── executor.py
│   │   │
│   │   ├── billing/
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   │
│   │   ├── marketplace/
│   │   │   ├── routes.py
│   │   │   └── service.py
│   │   │
│   │   └── sandbox/
│   │       ├── client.py     # call sandbox container
│   │       └── schemas.py
│   │
│   └── schemas/
│       ├── agent.py
│       ├── task.py
│       └── payment.py
│
├── sdk/
│   ├── shoujiki_sdk/
│   │   ├── agent.py
│   │   └── client.py
│   └── cli.py
│
├── sandbox/
│   ├── app.py               # sandbox execution server
│   ├── runner.py
│   └── Dockerfile
│
├── docker-compose.yml
└── requirements.txt
```

---

# 🧠 2. CORE DESIGN PRINCIPLE

> ❗ Runtime (API) NEVER executes agent code
> ✅ Sandbox service executes EVERYTHING

---

# 🔄 3. END-TO-END FLOW (CODE LEVEL)

```text
User Request
   ↓
API (/run-agent)
   ↓
Auth (JWT + wallet)
   ↓
Billing.verify_payment()
   ↓
AgentService.get_agent()
   ↓
SandboxClient.execute()
   ↓
Result returned
   ↓
Billing.release_payment()
```

---

# ⚙️ 4. MODULE BREAKDOWN (WITH CODE INTENT)

---

# 🔐 AUTH MODULE

## `routes.py`

```python
@router.post("/verify")
def verify_wallet(signature: str, message: str):
    return auth_service.verify(signature, message)
```

---

## `service.py`

```python
def verify(signature, message):
    wallet = verify_solana_signature(signature, message)
    token = create_jwt(wallet)
    return {"token": token}
```

---

# 🧩 AGENT MODULE

---

## `routes.py`

```python
@router.post("/deploy")
def deploy_agent(payload: AgentCreate):
    return agent_service.create_agent(payload)

@router.get("/")
def list_agents():
    return agent_service.get_all()
```

---

## `service.py`

```python
def create_agent(data):
    agent = Agent(**data)
    db.add(agent)
    db.commit()
    return agent

def get_agent(agent_id):
    return db.query(Agent).filter_by(id=agent_id).first()
```

---

---

# ⚙️ EXECUTION MODULE (CRITICAL)

---

## `executor.py`

```python
from app.modules.sandbox.client import execute_in_sandbox

def execute_agent(agent, input_data):
    return execute_in_sandbox(
        code=agent.code,
        input=input_data
    )
```

---

---

# 🐳 SANDBOX CLIENT (API SIDE)

---

## `client.py`

```python
import requests

SANDBOX_URL = "http://sandbox:8001/execute"

def execute_in_sandbox(code, input):
    response = requests.post(
        SANDBOX_URL,
        json={
            "code": code,
            "input": input
        },
        timeout=10
    )
    return response.json()
```

---

---

# 🧪 SANDBOX SERVICE (ISOLATED EXECUTION)

---

## `app.py`

```python
from fastapi import FastAPI
from runner import run_agent

app = FastAPI()

@app.post("/execute")
def execute(payload: dict):
    code = payload["code"]
    input_data = payload["input"]

    result = run_agent(code, input_data)
    return {"result": result}
```

---

## `runner.py`

```python
def run_agent(code, input_data):
    safe_globals = {
        "__builtins__": {
            "print": print,
            "len": len,
            "range": range,
        }
    }

    local_scope = {}

    exec(code, safe_globals, local_scope)

    agent = local_scope.get("agent")

    return agent.run(input_data)
```

---

👉 Later: wrap this with Docker container execution

---

---

# 💰 BILLING MODULE

---

## `service.py`

```python
def verify_payment(tx_signature, expected_amount):
    tx = solana_client.get_transaction(tx_signature)

    if not tx or tx.amount < expected_amount:
        raise Exception("Invalid payment")

    return True
```

---

```python
def release_payment(task_id):
    payment = db.query(Payment).filter_by(task_id=task_id).first()
    payment.status = "released"
    db.commit()
```

---

---

# 🛒 MARKETPLACE MODULE

---

## `routes.py`

```python
@router.get("/agents")
def marketplace():
    return marketplace_service.list_agents()
```

---

---

# 🚀 RUN AGENT ENDPOINT (MOST IMPORTANT)

---

## `agents/routes.py`

```python
@router.post("/run")
def run_agent(req: RunRequest, user=Depends(auth_user)):
    # 1. verify payment
    billing_service.verify_payment(req.tx_signature, req.amount)

    # 2. get agent
    agent = agent_service.get_agent(req.agent_id)

    # 3. execute
    result = executor.execute_agent(agent, req.input)

    # 4. release funds
    billing_service.release_payment(req.task_id)

    return {"result": result}
```

---

# 🗄️ DATABASE MODELS

---

## `agent.py`

```python
class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True)
    name = Column(String)
    code = Column(Text)
    price = Column(Float)
    creator_wallet = Column(String)
```

---

## `task.py`

```python
class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    agent_id = Column(String)
    status = Column(String)
    result = Column(Text)
```

---

## `payment.py`

```python
class Payment(Base):
    __tablename__ = "payments"

    task_id = Column(String, primary_key=True)
    amount = Column(Float)
    status = Column(String)
```

---

# 🧑‍💻 SDK DESIGN

---

## `agent.py`

```python
class Agent:
    def run(self, input):
        raise NotImplementedError
```

---

## `cli.py`

```python
@click.command()
@click.argument("file")
def deploy(file):
    code = open(file).read()

    requests.post(
        "http://api/agents/deploy",
        json={"code": code}
    )
```

---

# 🐳 DOCKER SETUP

---

## `docker-compose.yml`

```yaml
version: "3"

services:
  api:
    build: .
    ports:
      - "8000:8000"

  sandbox:
    build: ./sandbox
    ports:
      - "8001:8001"

  db:
    image: postgres
```

---

# 🎯 FINAL ARCHITECTURE PROPERTIES

---

## ✅ WHAT IS NOW SOLID

* Execution isolated (sandbox service)
* Runtime is safe
* Payment gates execution
* Registry is source of truth
* Simple, understandable system

---

## ⚠️ WHAT IS INTENTIONALLY SIMPLE

* No Kafka
* No microservices explosion
* No vector DB
* No async workers

---

# 🏁 FINAL RESULT

You now have:

> ⚡ A **clean, buildable, non-fragile core system**

