# GENLAYER PROJECT EXPLORER — SUBMISSION BUNDLE
**Project:** StillHere · **Version:** v0.7.0 · **Prepared:** 2026-08-27

Everything a reviewer needs to publish the Explorer listing lives in this directory.
Each field's value is exactly what to paste into the Portal form — no reformatting required.

---

## Contents of `deliverables/`

| Path | Purpose |
|---|---|
| `SUBMISSION.md` | This file — full submission text + rationale |
| `text/oneliner.txt` | One-liner (132 chars, cap 180) |
| `text/description.txt` | Description (988 chars, cap 1000) |
| `text/expected.txt` | Expected verification outcome (455 chars, cap 500) |
| `logo/logo-1024.png` | Portal upload — 1024×1024, 1.1 MB, under 2 MB cap |
| `logo/logo-512.png` | Fallback if you prefer the smaller file |
| `logo/logo.svg` | Editable source |

Char counts are verified with `printf '%s' "$(cat file)" | wc -m` — see the `Makefile` `deliverables-check` target.

---

## Section 01 — IDENTITY

- **Project name:** `StillHere`
- **Logo:** upload `deliverables/logo/logo-1024.png`
- **Primary category:** **Dispute Resolution**
- **Category tag 1:** **Evidence Assessment**
- **Category tag 2:** **Appeal Review**

### Category rationale (paste any of this into Portal notes if requested)

**Dispute Resolution** — the core action is a jury adjudicating whether a public profile is likely a scammer.
Aligned with how GenLayer positions itself: an "adjudication layer" for on-chain judgments. Not `AI & Agents` — that
tag is the default across the catalog and doesn't distinguish. Not `Social` — StillHere is not a communication
surface.

**Evidence Assessment** maps directly to:
- `request_verification(public_urls, image_urls, chat_sample, ...)` — accepts evidence at case creation
- `contribute_evidence(case_id, url, hash)` — third parties add corroborating URLs weighed on re-adjudication
- `_run_ai_jury` → `gl.nondet.web.render(url)` fetches and feeds the fetched text into the jury prompt

**Appeal Review** maps directly to:
- `file_dispute(case_id, counter_evidence_urls, chat_sample)` — subject-initiated Round 2 appeal
- `_run_ai_jury(is_dispute_round=True)` writes `verdict_v2`; `get_verdict` returns v2 in `RE_VERDICT` state
- `MAX_DISPUTES = 1` enforces exactly-one-appeal-per-case

**Rejected tags** (do NOT claim these):
- `Escrow Claims` — no 2-party escrow
- `Moderation Appeals` — no moderation/takedown of external platforms
- `License Claims` — no license terms processed
- `Jury Selection` — validator selection is a GenLayer concern; the app doesn't implement selection logic

---

## Section 02 — PROJECT SUMMARY

### One-liner (132 / 180 chars)

> A decentralized AI jury on GenLayer that reads public profiles and weighs evidence to help families flag suspected romance scammers.

### Description (988 / 1000 chars)

Contents of `deliverables/text/description.txt`, paste verbatim:

> StillHere is a romance-scam prevention protocol. A family member submits a suspect profile (public URL plus a paraphrased chat sample); the case triggers an AI jury inside the contract that fetches the profile page live and returns one of four advisory verdicts: LIKELY_REAL, INCONCLUSIVE, SUSPICIOUS, or LIKELY_SCAM_RING. The subject can file a Round 2 dispute that re-runs the jury with counter-evidence, and third parties can contribute corroborating URLs weighed on re-adjudication.
>
> Built for adult children helping isolated parents, romance-scam recovery groups, and moderators who need a neutral second opinion before flagging a profile.
>
> Why GenLayer: a single centralized AI cannot legally emit "LIKELY_SCAM_RING" verdicts on real people (defamation liability). GenLayer distributes the judgment across independent validator LLMs that must agree on verdict, confidence tolerance, and critical red-flag categories. No PII or chat content is stored on-chain, only keccak256 hashes.

---

## Section 03 — HOW TO TRY IT

### Prerequisites

- MetaMask installed.
- ~0.005 GEN in your wallet on studionet (chain id `61999`). Fund from the Studio Accounts panel at `https://studio.genlayer.com` — the public testnet faucet does not fund studionet.
- Any public web page you're willing to have the jury read as evidence (e.g. a Wikipedia article). No login-walled URL.

### Step 1 — Connect wallet and switch network
Open <https://stillhere-protocol.vercel.app>. Click **Connect Wallet** in the header. MetaMask prompts to add / switch to `GenLayer Studio Network` (chain id `0xF1EF` / `61999`). Approve. Your address appears in the header.

### Step 2 — Submit a verification request
Navigate to **Request Verify** in the header. Fill:
- **Public Profile URL:** any public page (e.g. `https://en.wikipedia.org/wiki/Romance_scam`)
- **Claimed Name:** any label the "profile" claims (e.g. `Test Subject`)
- **Chat Pattern Sample:** paste 1–2 short paraphrased sentences.

Click **Submit Request** → MetaMask signs `request_verification` with `value = base_fee = 0.001 GEN`. You are routed to `/pending/<caseId>?tx=<hash>`.

### Step 3 — Wait for the AI jury tx to finalize
The `/pending` page polls the transaction every 4 s until studionet reports `FINALIZED` and returns the `case_id`. The AI Jury runs inside the same transaction (leader fetches the URL, prompts an LLM, validators re-execute and vote on verdict + confidence + red-flag category sets). Typical wall clock: 30–120 s.

### Step 4 — Read the verdict on GenLayer Explorer
The app auto-navigates to `/verdict/<caseId>`. Because the studionet `eth_call` view route is currently returning `exit_code 1` for these contracts, the app shows a **"view unavailable" banner** with an **Inspect tx on Explorer** button. Click it.

You land on the transaction detail page under `explorer-studio.genlayer.com`. There you see:
- `GENVM RESULT: SUCCESS`
- `CONSENSUS RESULT: Accepted`
- The jury payload with the verdict label (one of `LIKELY_REAL / INCONCLUSIVE / SUSPICIOUS / LIKELY_SCAM_RING`), confidence, reason, and red-flag categories.

### Step 5 (optional) — File a Round 2 dispute
Back on `/verdict/<caseId>`, click **File Dispute (Round 2)**. Submit a counter-evidence URL and sign `file_dispute` with `value = dispute_fee = 0.002 GEN`. Return to `/pending/<caseId>` — the same tx-poll pattern applies; the AI Jury re-runs with `is_dispute_round=True` and writes `verdict_v2`.

### Step 6 (optional) — Contribute evidence
On the verdict page, click **Contribute Evidence** to add a corroborating URL that a subsequent dispute round will weigh.

### Expected end state
At least one `request_verification` transaction owned by your wallet appears on the Core-contract Explorer page with `SUCCESS / Accepted` and an on-chain verdict. Optionally one `file_dispute` and one `contribute_evidence` transaction on the same contract.

### If something goes wrong
- **MetaMask errors with `'from'`** — wrong chain. Retry `Connect Wallet`; the app re-runs `wallet_switchEthereumChain` for studionet (`0xF1EF`).
- **`insufficient funds`** — wallet has no GEN on studionet. Fund via Studio Accounts panel (Prerequisites). The public testnet faucet does NOT fund studionet.
- **Verdict never renders inside the app** — expected. Studio's `eth_call` view route is intermittent for these contracts. The verdict is written on-chain — read it from the linked Explorer transaction.

---

## Section 03 — EXPECTED VERIFICATION OUTCOME (455 / 500 chars)

Contents of `deliverables/text/expected.txt`, paste verbatim:

> After submitting a case, the request_verification transaction finalizes on studionet (visible on GenLayer Explorer with Result: SUCCESS and Consensus: Accepted). The tx contains the on-chain verdict produced by validator LLMs reaching consensus on label, confidence, and red-flag categories. The app shows a "view unavailable" banner while the studionet eth_call view route is intermittent, so verdict data is read from the linked transaction on Explorer.

---

## Section 03 — CONTRACT LINKS

Both contracts. Paste the two `explorer-studio` URLs into the Contract link field(s).

- **StillHereCore** (main entry, all user-facing flows):
  `https://explorer-studio.genlayer.com/address/0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5`

- **ScammerRegistry** (aggregate profile status; only Core writes to it):
  `https://explorer-studio.genlayer.com/address/0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df`

Network: **studionet** (chain id `61999` / `0xF1EF`). Explorer status: **Preview** (correct per rubric — Studio deploys are Preview, not Live).

Verified 2026-08-27 via `curl gen_getContractSchema` — the Core returns 11 methods, Registry returns 5. The Core address page renders `Balance`, `Transactions`, and rows with `SUCCESS / Accepted` verdict labels from historical calls.

---

## Section 03 — WEBSITE / GITHUB

- **Website:** https://stillhere-protocol.vercel.app
- **GitHub:** https://github.com/phu1271997/stillhere-protocol

---

## Section 03 — COMMUNITY LINKS (optional)

Leave empty. No Discord / X / Telegram yet.

---

# BEFORE-YOU-SUBMIT CHECKLIST

**Truthfulness**
- [x] Every feature named in the description is a UI-driven flow (request → verdict → dispute → contribute).
- [x] Studio view-route limitation is explicitly disclosed in Expected + How-to-try, no misrepresent.
- [x] Category tags each map to a contract function; rejected tags listed above.
- [x] Status listed as **Preview** because deployed on studionet.

**Deploy state**
- [x] Latest commit on `main` and pushed.
- [x] `vercel --prod` build ready — verified via `vercel ls`.
- [x] `gen_getContractSchema` returns full method list for both contracts.
- [x] Explorer address page renders transactions with `SUCCESS / Accepted`.

**End-to-end (YOU must run these)**
- [ ] Run `request_verification` from a wallet you own, funded on studionet — tx SUCCESS on Explorer.
- [ ] Run `contribute_evidence` once — round-trips the Evidence Assessment tag claim.
- [ ] (Optional) Run `file_dispute` once — round-trips the Appeal Review tag claim.
- [ ] Consider running `scripts/seed/seed.mjs` from a throwaway wallet to add 3 diverse historical cases at once (see `scripts/seed/README.md`).

**Assets & limits (verified)**
- [x] Logo: `deliverables/logo/logo-1024.png` — 1.1 MB, 1024×1024 PNG (under 2 MB cap).
- [x] One-liner 132 / 180 chars.
- [x] Description 988 / 1000 chars.
- [x] Expected verification outcome 455 / 500 chars.
- [x] Website + GitHub both provided.

**Understood consequences**
- [x] Changes requested = 1 fix window, 14 days.
- [x] Declined = no self-service resubmit — the honest disclosure of the `view unavailable` UX exists specifically to prevent Declined-for-misrepresent.
- [x] 1 Projects contribution = 1 Explorer entry — submit only after the corresponding Projects contribution is accepted.
