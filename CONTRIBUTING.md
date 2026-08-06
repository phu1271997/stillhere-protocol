# Contributing to StillHere

Thanks for considering a contribution. StillHere is an on-chain AI romance-scam prevention protocol deployed on GenLayer studionet. This document covers the development loop, style, and how to propose changes.

## 1. Local Setup

```bash
# Frontend
npm install
npm run dev            # Vite on http://localhost:3000

# Contracts (tests)
pip install genlayer-test
pytest tests/          # sets sim_installMocks before nondet txs
```

Studio-side contract testing:

1. Open <https://studio.genlayer.com/contracts>.
2. Load `contracts/scammer_registry.py` and `contracts/stillhere_core.py` (in that order — `set_core` on registry needs the core address).
3. See [`scripts/deploy.md`](scripts/deploy.md) for constructor args.

## 2. Branch & Commit Convention

- Branch names: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `security/…`.
- Commit messages follow Conventional Commits:
  - `feat(contracts): add pull-payment withdraw()`
  - `fix(frontend): point client at studionet RPC`
  - `security(core): canary defense against prompt injection`
- One logical change per PR. If a change touches contracts AND frontend, split into stacked PRs when reasonable.

## 3. Contract Changes — Extra Rules

Any change to `contracts/*.py` needs to satisfy the checklist in [`SECURITY.md §4`](SECURITY.md) before merge:

- No bare `int` in storage; use `bigint` for money and sized ints where bounded.
- Every `TreeMap` key is `str` at any calldata boundary; convert `Address` via `_addr_str()`.
- Every `gl.nondet.*` call lives inside `gl.vm.run_nondet(leader_fn, validator_fn)`.
- Validator compares **verdict semantics** (label + category sets + confidence tolerance), not free text.
- Storage struct definitions have `@allow_storage @dataclass`.

If your change requires a contract redeploy, include the new addresses in the PR description AND update `.env.example` and [`scripts/deploy.md`](scripts/deploy.md).

## 4. Frontend Changes — Extra Rules

- Never import `simulator` from `genlayer-js/chains` directly. Import `studionet` from `frontend/src/lib/client.ts` — it is the single source of truth for chain id + RPC + explorer.
- Never put a private key in a `VITE_` env var (it ships in the bundle).
- Writes: always via `sendGenLayerTransaction(...)`, which routes through `window.ethereum.request('eth_sendTransaction')`. Reads: `client.readContract(...)`.
- Always call `ensureStudionet()` on connect before allowing a write.

## 5. Tests

- `pytest tests/` runs the current suite. `conftest.py` auto-resets `__known_contract__` between tests to work around the "only one contract per module" GenVM constraint.
- Before running any nondet test transaction, install mocks via `sim_installMocks` — see [`tests/test_ai_jury_scenarios.py`](tests/test_ai_jury_scenarios.py) for the shape. The `params` MUST be a bare dict, not a list.

## 6. Reporting Security Issues

Please do not open a public issue for suspected vulnerabilities. Instead, open a GitHub Security Advisory on the repository. The threat model in [`SECURITY.md`](SECURITY.md) lists in-scope threats — a report matching one of those (or an out-of-scope gap you think should be in-scope) is welcome.

## 7. Scope Discipline

StillHere is deliberately narrow: on-chain AI advisory verdicts on public evidence, with pull-payment bounty distribution. Contributions that expand scope (payments off-chain, cross-chain identity, subject deletion, doxxing-adjacent features) should first open an issue for design review — see [`docs/ETHICS.md`](docs/ETHICS.md) for the explicit non-goals.
