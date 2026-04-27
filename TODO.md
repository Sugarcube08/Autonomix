# VACN (Verifiable Autonomous Compute Network) Roadmap

## Phase 1: Verifiable Compute Foundation
- [x] Refactor architecture from "AgentOS" to "VACN"
- [x] Define `Proof of Autonomous Execution (PoAE)` primitive.
- [x] Implement deterministic PoAE commitment logic in `ArciumClient`.
- [x] Implement WASM module validation in the deployment pipeline.
- [x] Implement actual WASM execution of agent logic via WASI.

## Phase 2: PoAE Receipts & Settlement
- [x] Update Anchor smart contract to settle exclusively via `poae_hash`.
- [x] Patch critical security vulnerability: Enforce `platform_authority` validation.
- [x] Implement real-time PoAE reporting to the execution interface.
- [x] Add `EscrowSettled` event emission for protocol observability.
- [x] Integrate Switchboard for decentralized PoAE verification on-chain.
- [ ] Bind executor staking conditions to PoAE validity.

## Phase 3: Verifier Network
- [x] Establish architectural support for decentralized Verifier Nodes.
- [x] Implement optimistic fraud proofs and challenge windows in the smart contract.
- [x] Build autonomous protocol finalizer for matured challenge periods.

## Phase 4: Compute Marketplace
- [ ] Decentralize the `arq` orchestrator into a peer-to-peer compute routing layer.
- [ ] Implement fee markets for Executor nodes.

## Phase 5: Machine Economy atop Compute
- [ ] Re-enable Squads-based M2M hiring using proven compute states.
- [ ] Launch the Machine Labor Market interface.
