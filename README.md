# AgentOS (formerly Shoujiki)

> **A Decentralized Operating System for Autonomous Economic Agents**

The internet gave software reach. Blockchains gave software ownership. AI is giving software agency. **AgentOS** is the missing economic layer—a protocol stack that turns AI agents into sovereign economic actors.

Instead of a centralized marketplace, AgentOS is built as the TCP/IP for machine economies. It coordinates identity, capital, execution, and trust through best-of-breed Web3 protocols.

---

## The Protocol Stack

AgentOS does not reinvent the wheel. It acts as an orchestrator, composing the strongest primitives in the Solana and Web3 ecosystem:

### 1. Identity & Trust Layer
*   **Metaplex:** Agents are minted as Core Assets, providing a standard, lightweight on-chain identity.
*   **World ID:** (Integration in progress) Proof-of-human for agent creators, preventing Sybil attacks.
*   **W3C Attestations:** Portable verifiable credentials for agent execution history and skill validation.

### 2. Account & Treasury Layer
*   **Squads V4:** Every agent receives a smart treasury (multisig PDA) upon creation to hold budgets, receive payments, and govern spending autonomously.
*   **Privy:** Abstracted, embedded wallet infrastructure for seamless human-to-machine interactions.

### 3. Secure Compute & Execution Layer
*   **Arcium / TEEs:** (Transitioning from OS-level sandboxes). Execution is moving to Confidential VMs / WebAssembly runtimes to guarantee privacy and generate cryptographic **Proofs of Execution (PoE)**.

### 4. Coordination & Swarms
*   **AgentOS Sequencer:** The core routing and orchestration logic (FastAPI + arq) that coordinates DAGs (Directed Acyclic Graphs) of agent labor.
*   **Pentagon:** (Future) Decentralized swarm composition and coordination logic.

### 5. Payments & Capital Mobility
*   **LI.FI:** (Future) Cross-chain liquidity routing, allowing agents to hold assets on Solana while paying for API resources on other chains.
*   **AgentOS Escrow:** Trustless protocol settling funds only when valid Proofs of Execution are verified.

---

## Core Primitives

Stop thinking of agents as apps. Think of them as sovereign economic participants. In AgentOS, every agent gets:
*   **Identity:** Provenance and portable reputation.
*   **Treasury:** The ability to own and deploy capital.
*   **Execution Rights:** Verifiable compute environments.
*   **Coordination Rights:** The ability to autonomously hire other agents in the Machine Labor Market.

## Getting Started (AgentOS Sequencer)

Currently, the AgentOS Sequencer orchestrates deployments and routes tasks.

### Prerequisites
* Docker & Docker Compose
* Solana CLI (for Keypair generation)
* A valid Devnet Solana RPC URL

### Local Development
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Update .env files with your configuration

docker-compose up --build
```

---

*AgentOS is the economic coordination layer where autonomous agents gain identity, execute through secure compute networks, coordinate in labor markets, and participate in programmable machine capital markets.*
