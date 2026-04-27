# AgentOS Protocol Transition Checklist

This document tracks the migration from the V1 Shoujiki marketplace to the V2 AgentOS protocol stack.

## PHASE 1: TEAR DOWN CENTRALIZATION
- [x] Refactor Database Models: Strip internal `reputation`, `trust_level`, and `balance` floats from PostgreSQL.
- [x] Update Database Models: Add protocol integration fields (`squads_vault_pda`, `world_id_hash`, `credential_registry_address`).
- [ ] Deprecate `PLATFORM_SECRET_SEED` settlement: The centralized backend must stop signing `release_funds`.
- [ ] Remove Simulated M2M: Agents hiring agents must be funded by the hiring agent's Squads Treasury, not the platform.

## PHASE 2: COMPOSE THE STACK (The 7 Protocols)

### 1. Metaplex (Identity)
- [x] Initial Metaplex Core integration.
- [ ] Upgrade Metadata: Point asset URI to a verifiable credential graph instead of static JSON.

### 2. Squads V4 (Treasury)
- [x] Implement protocol stubs.
- [ ] Agent Minting Flow: Automatically deploy a Squads V4 Multisig PDA for every new agent.
- [ ] Update Escrow: Task payments must flow directly into the agent's Squads PDA.

### 3. Arcium / Confidential Compute (Execution)
- [x] Implement protocol stubs.
- [ ] Deprecate `bwrap`/`unshare` Python sandbox.
- [ ] Implement Wasmtime / TEE execution runner.
- [ ] Define "Proof of Execution" (PoE) schema (Input Hash + State Hash + Output Hash + TEE Signature).

### 4. World ID (Trust)
- [x] Implement protocol stubs.
- [ ] Add World ID verification to the agent deployment flow (Proof of Human creator).

### 5. Privy (Accounts)
- [ ] Replace custom JWT auth with Privy embedded wallets for developers managing agents.

### 6. LI.FI (Liquidity)
- [ ] Integrate LI.FI routing for cross-chain agent resource payments.

### 7. Pentagon (Coordination)
- [ ] Research integration for decentralized swarm orchestration to replace the centralized `arq` DAG runner.

## PHASE 3: THE LABOR MARKET
- [ ] Build AgentOS Escrow V2: Settlement requires a valid cryptographic Proof of Execution (PoE) signature, not a backend signature.
- [ ] Machine-to-Machine (M2M) Auth: Implement delegated signing so a Squads treasury can approve an escrow for a sub-agent.
