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

See [`docs/ETHICS.md`](docs/ETHICS.md) for detailed privacy specifications.

---

## 4. Deployed Contracts on GenLayer Studionet

| Contract | Deployed Address |
|---|---|
| **StillHereCore** | [`0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5`](https://explorer-studio.genlayer.com/address/0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5) |
| **ScammerRegistry** | [`0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df`](https://explorer-studio.genlayer.com/address/0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df) |

> **Live app**: <https://stillhere-protocol.vercel.app>

For deployment logs and parameters, see [`scripts/deploy.md`](scripts/deploy.md).

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

Unit tests verify AI Jury mock scenarios (`LIKELY_REAL`, `SUSPICIOUS`, `LIKELY_SCAM_RING`), E4 verdict normalization, registry updates, and dispute flows. The `tests/test_lifecycle.py` regression module runs against the real contract source with a minimal SDK stub (packaged `gltest` wasm loader lacks `gl.block` at the depth these contracts use — same code path executes fine on studionet).

Current suite: **63 tests passing** covering deterministic helpers, E4 downgrade boundary, canary defense, JSON extraction, validator semantics (verdict + confidence ±10 + CRITICAL/WARNING category-set match), and the full request → verdict → dispute state machine.

---

## 7. Reviewer Walkthrough (5-minute demo)

**Prerequisites:** MetaMask installed, GEN balance on studionet (transfer from a pre-funded Studio account via `https://studio.genlayer.com` → **Accounts** panel).

1. Open <https://stillhere-protocol.vercel.app>. Click **Connect Wallet** in header → MetaMask prompts to add / switch to `GenLayer Studio Network` (chain id `61999`).
2. Click **Request AI Verification**. Fill:
   - Public Profile URL: any public page (e.g. `https://en.wikipedia.org/wiki/Romance_scam`)
   - Claimed Name: `Test Subject`
   - Chat sample: paste any short paraphrased text
3. Submit → MetaMask signs `request_verification` → page routes to `/pending/<realCaseId>?tx=<hash>`, polls studionet until the AI Jury tx finalizes, then renders the verdict from `get_case(caseId)` + `get_verdict(caseId)`.
4. Verdict page shows label / confidence / reason / red flags, links to the tx on Explorer, and offers **File Dispute** for Round 2 re-adjudication.
5. Open **/cases** to jump between any cases you have submitted this session (persisted in `localStorage`).
6. Open **/registry**, paste a `profile_hash` from a submitted case to check aggregated status across all its cases.

**If `get_case` / `get_status` view read fails** (studionet `eth_call` route is intermittently offline for view execution — a Studio-side quirk, not a contract bug): the tx itself is on-chain (verify on Explorer); the frontend falls back to persisted submission metadata + tx receipt data and shows a clear "view unavailable" banner. Never displays a fake verdict.

---

## 8. Repository Layout

```
contracts/       # Intelligent Contract Python — StillHereCore + ScammerRegistry
frontend/src/    # Vite + React + TypeScript + Tailwind dApp
tests/           # gltest + deterministic regression coverage
scripts/         # deployment guide + historical addresses
docs/            # ETHICS.md, PROMPT_DESIGN.md
ARCHITECTURE.md  # Mermaid system diagram
ECONOMICS.md     # fee & bounty flow
SECURITY.md      # T1–T9 threat model
```

---

## 9. Submission — GenLayer Builder Program (Track Builders)

- **Repo:** <https://github.com/phu1271997/stillhere-protocol>
- **Live app:** <https://stillhere-protocol.vercel.app>
- **StillHereCore:** [`0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5`](https://explorer-studio.genlayer.com/address/0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5)
- **ScammerRegistry:** [`0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df`](https://explorer-studio.genlayer.com/address/0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df)
- **Network:** GenLayer Studionet (chain id `61999` / `0xF1EF`, RPC `https://studio.genlayer.com/api`)

**Why this project dies without GenLayer:** a single centralized AI cannot legally issue "SUSPICIOUS" or "LIKELY_SCAM_RING" verdicts on real individuals — single-entity defamation liability kills it. GenLayer's decentralized AI Jury converges on the same subjective verdict from independent validator LLMs, distributes the judgment across the consensus set, and reads live public profile pages directly on-chain without an oracle — none of which is possible on Solidity or on any centralized AI API.
