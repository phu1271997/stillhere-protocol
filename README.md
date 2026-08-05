# StillHere — On-Chain AI Romance Scam Prevention Protocol

> **Deployed on GenLayer Studionet** (Chain ID: `61999` / `0xF1EF`, RPC: `https://studio.genlayer.com/api`)
> Submitted to **GenLayer Builder Program — Track Builders** (`portal.genlayer.foundation`)

---

## 1. Executive Summary

**StillHere** is an on-chain AI romance scam prevention protocol featuring a decentralized AI Jury built on GenLayer Intelligent Contracts. It enables families and potential victims to submit public profile links and anonymized interaction patterns to an independent validator consensus network.

### The Problem
- **$1.14 Billion USD** lost to romance scams in 2023 (FTC).
- Victims (predominantly aged 55+) experience isolation, vulnerability, and emotional shame, preventing early reporting.
- Centralized dating platforms silently ban suspicious profiles without public warnings due to civil litigation fears.
- Traditional legal authorities (e.g. FBI IC3) only act post-financial loss.

### Why GenLayer is Uniquely Suited
Traditional smart contracts (Solidity) cannot read live public social web pages directly (`gl.nondet.web.render`), perform reverse image searches (`gl.nondet.web.get`), or execute subjective context assessments (`gl.nondet.exec_prompt`). Centralized AI APIs refuse to issue fraud risk verdicts due to single-entity liability. GenLayer's decentralized AI Jury allows validator nodes to reach consensus on subjective verdicts without any single entity holding central liability.

---

## 2. Multi-Contract Architecture

```
                       ┌────────────────────────────┐
                       │      StillHereCore         │
Requester ─────────►   │                             │
Contributor ──────►    │  - request_verification     │
Subject ──────────►    │  - contribute_evidence      │
                       │  - file_dispute             │
                       │  - claim_bounty             │
                       │  - _run_ai_jury (nondet)    │
                       └────────────┬────────────────┘
                                    │ gl.get_contract_at(reg_addr)
                                    ▼
                       ┌────────────────────────────┐
                       │    ScammerRegistry          │
                       │  - upsert_status            │
                       │  - subscribe_watcher        │
                       │  - get_status               │
                       └────────────────────────────┘
```

- **`contracts/stillhere_core.py`**: Handles case creation, non-deterministic AI Jury execution (`gl.vm.run_nondet`), verdict normalization (E4), dispute rounds, and pull-based bounty claims.
- **`contracts/scammer_registry.py`**: Maintains historical profile status by canonical `profile_hash` (E8) and manages watcher subscriptions.

---

## 3. Privacy & Safety Safeguards (E1–E8)

StillHere implements strict privacy and anti-harassment safeguards:
- **E1**: Plaintext chat samples are NEVER stored in contract state. Only `keccak256(chat_sample)` is recorded.
- **E2**: Personal Identifying Information (PII) is hashed (`keccak256`) prior to storage.
- **E3**: Verdict labels are limited to 4 advisory categories: `LIKELY_REAL`, `INCONCLUSIVE`, `SUSPICIOUS`, `LIKELY_SCAM_RING`.
- **E4**: `LIKELY_SCAM_RING` is automatically downgraded to `SUSPICIOUS` if confidence < 85 or critical red flags < 2.
- **E5**: Disclaimer banners on UI state that verdicts are advisory and not legal determinations.
- **E6**: Subject dispute flow enables appellate Round 2 AI Jury re-adjudication upon counter-evidence submission.
- **E8**: Public registry lookups require canonical `profile_hash` (plaintext names are never stored).

See [`docs/ETHICS.md`](file:///Users/peter/Downloads/AI/Genlayer/7-StillHere/docs/ETHICS.md) for detailed privacy specifications.

---

## 4. Contract Deployment on Studionet

1. Open GenLayer Studio: `https://studio.genlayer.com/run-debug`
2. Deploy `contracts/scammer_registry.py` first.
3. Deploy `contracts/stillhere_core.py` passing `registry_addr`, `base_fee`, `dispute_fee`, `contributor_share_bps`, `scam_confidence_threshold`, and `scam_critical_flags_required`.
4. Call `scammer_registry.set_core(core_address)` to authorize status updates.
5. Verify transaction `Result: SUCCESS`.

For contract addresses and transaction links, see [`scripts/deploy.md`](file:///Users/peter/Downloads/AI/Genlayer/7-StillHere/scripts/deploy.md).

---

## 5. Running the Frontend Local Dev Server

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Point your browser to `http://localhost:3000`. Connect MetaMask on GenLayer Studionet (Chain ID `61999`).

---

## 6. Testing with `gltest`

```bash
pip install genlayer-test
pytest tests/
```

Unit tests verify AI Jury mock scenarios (`LIKELY_REAL`, `SUSPICIOUS`, `LIKELY_SCAM_RING`), E4 verdict normalization, registry updates, and dispute flows.
