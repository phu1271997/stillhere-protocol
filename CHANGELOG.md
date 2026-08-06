# Changelog

All notable changes to the StillHere project will be documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] — 2026-08-06

### Fixed — Critical
- **Studionet RPC bug**: `frontend/src/lib/client.ts` was importing `simulator` from `genlayer-js@0.1.2/chains`, whose `rpcUrls.default.http` is hard-wired to `http://127.0.0.1:4000/api` (localnet). All `readContract` calls silently hit localhost in production, breaking the Registry page and any future poll-for-state UI. Replaced with a local `defineChain({...})` that hard-codes `https://studio.genlayer.com/api` and chain id `61999`. `wallet.ts` now imports the same constants so MetaMask's `wallet_addEthereumChain` and the read client can never drift.
- Removed the `createAccount()` burner fallback in `makeClient()` — a random keypair with 0 balance can never transact on hosted studionet (see R21 in the project error cheatsheet). `makeClient` now throws when called without a connected wallet address, and `sendGenLayerTransaction` throws when there is no `window.ethereum`.

### Security (contract changes — requires redeploy)
- **Prompt-injection canary defense** (T2): the system prompt embeds a per-case canary `SH-R-{case_id:08d}-CANARY` (`SH-D-…` for dispute rounds) and requires the LLM to echo it verbatim in `response.canary`. Any evidence text is scrubbed of the canary before entering the prompt. Missing/altered canary → `CANARY_MISMATCH` → case terminated in `FAILED` state.
- **Multi-perspective prompting**: the jury system prompt now instructs an internal three-lens deliberation (Forensic + Skeptic + Legal) before emitting the single JSON verdict. Explicit presumption-of-innocence in the Skeptic and Legal lenses.
- **Stricter validator** (T5): confidence tolerance narrowed from ±12 to ±10; CRITICAL and WARNING red-flag categories must match as sets (not just counts). Reason/evidence free-text is intentionally ignored.
- **Pull-payment bounty withdrawal** (T4): `claim_contribution_bounty` no longer transfers native GEN directly; it credits `withdrawable[contributor]`. Payout happens in a separate `withdraw()` call that zeroes the balance before `emit_transfer`, defeating reentrancy.
- **Canonical hash / address normalization** (T6): `_canon_hash()` lowercases and strips all `profile_hash`, `evidence_hash`, `claimed_identity_hash` inputs. `_addr_str()` lowercases addresses used as TreeMap keys and equality checks (registry `core`/`admin`, core `admin`, contributor equality). Prevents same-profile-different-case duplication.
- **Bounds & guards**: `public_urls ≤ 6`, `image_urls ≤ 3`, `counter_evidence_urls ≤ 5`, `chat_sample ≤ 5000` chars, non-negative bounty topup, non-empty profile hash, duplicate `evidence_hash` per case rejected, `share ≤ bounty_pool`, `withdraw_treasury` requires positive amount, `LIKELY_REAL` cannot trigger contributor bounty.

### Added
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — full system diagram (Mermaid) covering read/write paths, dispute flow, pull-payment flow, storage layout.
- [`ECONOMICS.md`](ECONOMICS.md) — fee & bounty flow, verdict-gating logic, checks-effects-interactions notes, open economic questions.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — dev loop, branch/commit convention, contract & frontend rules, security-report path.
- `SECURITY.md v2` — 9-vector threat model (T1–T9), trust boundary table, pre-audit self-check.
- Rewrote `types.d.ts` to stop lying about a `studionet` export from `genlayer-js/chains`.

## [0.1.0] — 2026-08-05

### Added
- Initial `StillHereCore` and `ScammerRegistry` Intelligent Contracts on GenLayer studionet.
- Non-deterministic AI Jury via `gl.vm.run_nondet` with semantic validator.
- Privacy safeguards E1–E8 (chat hashing, PII hashing, verdict normalization E4).
- Round-2 dispute mechanism.
- `gltest` suite with mock LLM/web scenarios.
- Vite + React + TypeScript + Tailwind frontend with `genlayer-js` + MetaMask.
- Baseline docs: `README.md`, `ETHICS.md`, `PROMPT_DESIGN.md`, `SECURITY.md`, `scripts/deploy.md`.
