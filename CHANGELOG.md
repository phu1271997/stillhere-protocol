# Changelog

All notable changes to the StillHere project will be documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.6.0] — 2026-08-25

### Added — richer public-facing content
- **Rewritten `Home` page** — expanded from 3 minimal cards to a full landing: hero + 3 stats, "the problem" (centralized AI won't touch it / platforms silently ban / law enforcement acts too late), "how StillHere fixes it" (4 property rows), 5-step "Submit a case" walkthrough with linked CTA to `/request`, verdict-vocabulary grid (4 labels with E4 rule callout), "who this is built for" (3 concrete audiences), 6-item FAQ (`<details>` accordion), and a bottom CTA with Start / Registry / GitHub buttons. All content geared at first-time visitors — no assumed blockchain background.
- **Rewritten `HowItWorks` page** — protocol reference: two-contract architecture diagram, the four design pillars, 5-step consensus mechanics (canary defense, semantic agreement rule with the exact ±10 confidence + CRITICAL/WARNING category-set match, E4 normalization), full red-flag taxonomy (all 8 categories with plain-English descriptions), three end-to-end flow cards (Request→Verdict, Dispute→Round 2, Contribution→Bounty with pull-payment safety note), ASCII state-machine diagram, economics section (base_fee / dispute_fee / contributor_share_bps), E1–E8 privacy safeguards in plain English, wallet + funding prerequisites, honest disclosure of the studionet view-route limitation, and a live-Explorer CTA row.

### No contract changes.
### No test changes — 63/63 still passing.

## [0.5.0] — 2026-08-25

### Added — Explorer submission prep
- **`/contribute/:id` page** — first UI caller for `contribute_evidence(case_id, evidence_url, evidence_hash)`. Hashes the URL as `keccak256(url.toLowerCase())` client-side for dedup, signs the tx via MetaMask, and polls to finalization. Fixes the M1 dead-code blocker for that method and legitimizes the `Evidence Assessment` category tag claim on the Explorer submission.
- **Contribute Evidence button on VerdictDetail** — sits next to File Dispute so a reviewer can drive both flows from the same page.
- **`frontend/public/logo.svg` + `logo-1024.png` + `logo-512.png`** — heart-clipped-inside-shield mark using brand green `#22C55E`, matches app accent. Rendered via `qlmanage`. 1.1 MB / 300 KB, under the 2 MB Portal cap. Also wired as favicon + apple-touch-icon in `index.html`.
- **`scripts/explorer-submission/`** — full char-counted Explorer submission draft: `oneliner.txt` (132/180), `description.txt` (988/1000), `expected.txt` (455/500), `SUBMISSION.md` (full doc with category rationale, per-tag contract-function mapping, "How to try it" steps, honest known-limitation disclosure for the studionet view route).

### Known limitation (disclosed)
- Studio `eth_call` view route returns `exit_code 1` for both contracts (a Studio-runtime-level failure — not caused by our contract code; `gen_getContractSchema` loads fine, write path executes fine, verdicts land on-chain). The frontend already handles this with a "view unavailable" banner + retry button + explicit Explorer link on both Registry and VerdictDetail pages. The Explorer submission text points reviewers to the transaction detail page on `explorer-studio.genlayer.com` for the on-chain verdict.

## [0.4.0] — 2026-08-25

### Fixed
- **README broken file:// links** — `docs/ETHICS.md` and `scripts/deploy.md` pointed at an absolute `/Users/peter/Downloads/AI/Genlayer/7-StillHere/…` path from an earlier working tree, breaking on the public repo. Now relative.

### Added
- **Reviewer Walkthrough (README §7)** — 5-minute click-through of the request → verdict → dispute flow, including the demo-safe fallback story when the studionet `eth_call` view route is intermittently offline. Also adds §8 layout map and §9 Submission block with contract addresses, live URL, repo URL, and the "why this dies without GenLayer" pitch line.
- **`/cases` route** — a per-browser list of every case the user has submitted this session, sourced from the same `localStorage` write path `RequestVerify` uses. One-click jump into pending / verdict / dispute pages for each case, plus a link out to the tx on Explorer.
- **Retry buttons** on `Registry` and `VerdictDetail` — the studionet view route (`eth_call` for `get_case` / `get_status`) currently returns `execution failed / exit_code 1` for these contracts; the retry re-runs the read without a full page reload, and both pages now surface a direct "Inspect on Explorer" link so the reviewer can confirm the on-chain state independently.

### Tests
- **63 tests passing** (up from 26). Filled every previously-`assert True` placeholder with real deterministic coverage:
  - `test_ai_jury_scenarios.py` — 7 tests: the four verdict labels + the E4 boundary (LIKELY_SCAM_RING → SUSPICIOUS when confidence < 85 OR CRITICAL flags < 2) + JSON-roundtrip survival + missing-canary detection.
  - `test_dispute_flow.py` — 5 tests: file_dispute state gate (only VERDICT), `get_verdict` returns v2 iff RE_VERDICT (invariant `VerdictDetail.tsx` relies on), `MAX_DISPUTES == 1`, dispute-round canary disjoint from request-round canary.
  - `test_edge_cases.py` — 12 tests: `_extract_json` survives empty / whitespace / non-dict-root / trailing-garbage input; confidence-boundary sweep across the E4 threshold; canary position-agnostic scrub; hash canonicalization collapses case-only variants; the eight red-flag categories + four verdict labels are all wired into the prompt.
  - `test_registry_cache.py` — 6 tests: default row shape matches the Registry page contract; monotonic case_count; **anti-whitewash invariant** (a later low-confidence LIKELY_REAL cannot unseat an earlier high-confidence SUSPICIOUS); case-insensitive key normalization prevents split rows.
  - `test_request_and_verdict.py` — 12 tests: every `request_verification` guard branch (URL bounds 1..6, image bounds 0..3, chat sample 0..5000 chars, non-negative topup, sufficient paid fee, non-empty profile_hash) + verdict clamp / default / truncation semantics.
- Shared `genlayer` SDK stub extracted from `test_lifecycle.py` into `conftest.py` — one source of truth for the module-level `import genlayer` shim, reused by all seven test modules.

### Contracts
- No contract source changes. Deployed studionet addresses unchanged from 0.3.0.

## [0.3.0] — 2026-08-10

### Fixed — judge feedback ("preserve case_id, poll on-chain, render real verdict")

Prior versions submitted `request_verification`, threw away the returned `case_id`, and routed the user to `/pending/0` → `/verdict/0` which rendered a **hardcoded fixture verdict**. That is now gone end-to-end.

- **`RequestVerify`** submits the tx via MetaMask, then polls `eth_getTransactionByHash(txHash)` on studionet until it reaches `FINALIZED` / `ACCEPTED` and extracts the real `case_id` from the transaction's `result` field. Only THEN does it navigate — to `/pending/${realCaseId}?tx=${txHash}`. Submission metadata (URLs, hashes, requester, tx hash, timestamp) is persisted to a per-case entry in `localStorage` for the downstream pages.
- **`Pending`** now polls `get_case(caseId)` on-chain every 4 s and transitions to the verdict page as soon as the state moves out of `PENDING` (VERDICT / RE_VERDICT / FAILED). If the read view is temporarily unavailable it also watches the parent tx status and hands off after the tx finalizes so the flow never dead-ends.
- **`VerdictDetail`** reads `get_case(caseId)` + `get_verdict(caseId)` via a new low-level `readView` RPC helper (`eth_call` + JSON decode of the studio-returned hex payload) and renders the actual on-chain label, confidence, reason, red flags, and finalized-at. All fixture data removed. If the view read fails, the page falls back to on-chain tx data (from `eth_getTransactionByHash`) plus the persisted submission metadata, with a clear "view unavailable" banner — no fake verdict is ever shown.
- **`Dispute`** takes the real `case_id` from the URL (no more `id || '0'`), signs `file_dispute` via MetaMask, polls the dispute tx to finalization, and records `disputeTxHash` back into the case store before navigating.
- **`Registry`** attempts `get_status(profile_hash)` via the same helper and surfaces the raw error text on failure instead of silently returning an `UNKNOWN` stub.

### Contracts

- `_empty_verdict`, `_build_verdict_from_ai`, and every `DynArray[...]`/`TreeMap[...]` construction that previously used the plain generic-call syntax now goes through `gl.storage.inmem_allocate(...)` per SDK R18. The old form worked at runtime on studionet but broke storage-descriptor round-tripping in the packaged Python SDK, blocking any test coverage of the full lifecycle.

### Tests

- New `tests/test_lifecycle.py` — 21 regression tests covering:
  - `_canon_hash`, `_addr_str` normalization (T6)
  - E4 downgrade rule (`LIKELY_SCAM_RING` → `SUSPICIOUS` under thresholds)
  - `_extract_json` handling of fenced / embedded / malformed JSON
  - Canary defense (`_canary_token` shape + `_strip_canary` sanitization)
  - `_build_jury_prompt` embeds the canary, the Forensic + Skeptic + Legal directive, the allowed label enum, and the allowed category enum
  - A state-machine simulator that walks request → verdict → dispute → re-verdict and asserts `get_verdict` returns `verdict_v2` after a dispute — matching the read path the frontend depends on
  - Validator semantics: same verdict / confidence-within-tolerance / same CRITICAL-and-WARNING category sets → agree; different verdict, different categories, or confidence >10 apart → disagree
- The test module intentionally sidesteps `gltest`'s wasm loader (packaged SDK v0.2.16 is missing `gl.block` and some storage-slot indirection at the depth these contracts use) and runs the deterministic helpers directly against the real contract source with a minimal stub of the SDK surface. Same code path, no on-chain runtime dependency.

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
