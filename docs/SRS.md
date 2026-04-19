# 📄 SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

## 🚀 Project: **Shoujiki — Onchain AI Agent Marketplace (Solana)**

---

# 1. 🧠 SYSTEM OVERVIEW

## 1.1 Purpose

Shoujiki is a **Solana-native marketplace** where:

* Developers create and deploy AI agents using an SDK
* Agents are registered and listed on a marketplace
* Users connect wallets, fund escrow, and hire agents
* Agents execute tasks and receive payment automatically

---

## 1.2 Vision

> Enable **Agentic Commerce on Solana** — where software agents become **onchain economic entities**

---

## 1.3 Core Value Proposition

* Trustless execution (wallet + payment gating)
* Programmable agents as services
* Developer monetization layer
* Seamless UX for non-technical users

---

# 2. 🎯 SYSTEM SCOPE

## Included

* SDK for agent creation
* Agent registry (storage + metadata)
* Marketplace (UI + API)
* Wallet-based authentication
* Escrow + payment flow (Solana)
* Agent execution system
* Containerized deployment

---

## Excluded (for MVP)

* Multi-agent orchestration
* Advanced AI pipelines
* Cross-chain support
* Complex reputation systems

---

# 3. 🧩 SYSTEM ARCHITECTURE

## 3.1 High-Level Architecture

```text
Frontend (Next.js)
        ↓
Backend API (FastAPI)
        ↓
Core Modules:
  - Auth (Wallet)
  - Agent Registry
  - Execution Engine
  - Billing (Escrow)
        ↓
Sandbox (Docker Execution)
        ↓
Solana Network (Devnet/Testnet)
```

---

## 3.2 Deployment

* Dockerized services
* Single-node or docker-compose for demo
* Future: scalable infra

---

# 4. 👥 USER ROLES

---

## 4.1 Developer

* Creates agents via SDK
* Deploys agents
* Sets pricing
* Earns from usage

---

## 4.2 User (Client)

* Connects wallet
* Browses marketplace
* Funds escrow
* Executes agents

---

# 5. ⚙️ FUNCTIONAL REQUIREMENTS

---

# 5.1 SDK MODULE

### Features:

* Define agent class
* Standard interface (`run(input)`)
* CLI for deployment

---

### Example:

```python
class Agent:
    def run(self, input):
        return result
```

---

### CLI:

```bash
shoujiki deploy agent.py --price 0.01
```

---

### Requirements:

* Validate agent structure
* Package agent code
* Send to backend with wallet signature

---

# 5.2 AGENT REGISTRY

---

### Responsibilities:

* Store agent metadata
* Store agent code
* Maintain ownership

---

### Data Model:

```json
{
  "id": "uuid",
  "name": "agent_name",
  "code": "...",
  "price": 0.01,
  "creator_wallet": "...",
  "created_at": "..."
}
```

---

### Requirements:

* CRUD operations
* Fetch agents
* Versioning (optional)

---

# 5.3 MARKETPLACE

---

### Features:

* List agents
* Search agents
* Display pricing
* Trigger execution

---

### UI Requirements:

* Wallet connect (Phantom)
* Agent cards
* Execution form
* Transaction confirmation

---

# 5.4 AUTHENTICATION (WALLET)

---

### Flow:

1. User signs message
2. Backend verifies signature
3. JWT issued

---

### Requirements:

* No username/password
* Wallet = identity

---

# 5.5 PAYMENT + ESCROW SYSTEM

---

### Flow:

```text
User → Pay → Escrow → Execute → Release → Developer
```

---

### Requirements:

* Accept transaction signature
* Verify via Solana RPC
* Lock funds before execution
* Release after success

---

### MVP Simplification:

* Off-chain escrow tracking
* On-chain verification

---

# 5.6 AGENT EXECUTION ENGINE

---

### Responsibilities:

* Fetch agent code
* Validate payment
* Execute agent
* Return result

---

### Requirements:

* Must NOT execute in main process
* Must call sandbox

---

# 5.7 SANDBOX (CRITICAL)

---

### Responsibilities:

* Isolated execution
* Resource limits
* Safe environment

---

### Requirements:

* Docker-based execution
* No host access
* Time + memory limits

---

# 5.8 BILLING SYSTEM

---

### Responsibilities:

* Track payments
* Link to tasks
* Release funds

---

### Data Model:

```json
{
  "task_id": "...",
  "amount": 0.01,
  "status": "locked | released"
}
```

---

# 6. 🔄 SYSTEM FLOW

---

## 6.1 Developer Flow

```text
Write Agent → Deploy via SDK → Stored in Registry → Visible in Marketplace
```

---

## 6.2 User Flow

```text
Connect Wallet → Browse → Select Agent → Pay → Execute → Receive Result
```

---

## 6.3 Execution Flow

```text
Verify Payment → Fetch Agent → Sandbox Execute → Return Output → Release Funds
```

---

# 7. 🗄️ DATABASE DESIGN

---

## Tables:

### Agents

* id
* name
* code
* price
* creator_wallet

---

### Tasks

* id
* agent_id
* input
* result
* status

---

### Payments

* task_id
* amount
* status

---

# 8. 🔐 NON-FUNCTIONAL REQUIREMENTS

---

## Security

* No direct code execution in runtime
* Sandbox isolation
* Wallet signature verification

---

## Performance

* Execution < 5 seconds (MVP)
* API response < 500ms

---

## Scalability (Future)

* Horizontal scaling of sandbox workers

---

## Reliability

* No task loss
* Payment linked to execution

---

# 9. 🎨 UI/UX REQUIREMENTS

---

## Screens:

1. Landing page
2. Marketplace
3. Agent detail page
4. Execution modal
5. Wallet connect

---

## UX Goals:

* 1-click execution
* Clear pricing
* Visible transaction state

---

# 10. 🐳 DEPLOYMENT REQUIREMENTS

---

## Docker Setup:

* Backend container
* Sandbox container
* Database (Postgres)
* Optional Redis

---

## Command:

```bash
docker-compose up
```

---

# 11. 🧪 TESTING REQUIREMENTS

---

* Agent execution success/failure
* Payment verification
* Wallet auth
* API integrity

---

# 12. 🧭 FUTURE ROADMAP (POST-HACKATHON)

---

* Real on-chain escrow (program)
* Agent reputation system
* Multi-agent workflows
* Streaming outputs
* Plugin ecosystem

---

# 13. 🏆 HACKATHON ALIGNMENT

---

## ✔ Agentic Commerce

* Agents as services
* Programmable economic units

---

## ✔ Solana Usage

* Wallet-based identity
* Transaction verification
* Payment gating

---

## ✔ Innovation

* AI agents as onchain primitives

---

## ✔ Impact

* Developer monetization
* Automation economy

---

# 🎯 FINAL SUMMARY

Shoujiki is:

> ⚡ A **Solana-powered AI agent marketplace** where:
>
> * Developers deploy agents
> * Users hire them via crypto
> * Execution is trust-gated
> * Payments are automated
