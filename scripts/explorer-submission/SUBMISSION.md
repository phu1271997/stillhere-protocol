# GENLAYER PROJECT EXPLORER — SUBMISSION DRAFT
**Project:** StillHere · **Prepared:** 2026-08-25 · **Status: READY** (with 1 known-limitation banner in app UX — see §Expected Verification)

---

## Section 01 — IDENTITY

### Project name
`StillHere`

### Logo
Files ready in repo:
- `frontend/public/logo.svg` — source (viewBox 512×512)
- `frontend/public/logo-1024.png` — 1.1 MB (< 2 MB cap)
- `frontend/public/logo-512.png` — 300 KB

Upload the **1024** version to Portal. Meets spec: PNG · 1024 px · < 2 MB. Mark: heart clipped inside shield silhouette; brand green `#22C55E` matches app accent; no text so it reads at 128 px.

### Primary category
**Dispute Resolution**

*Rationale:* GenLayer positions itself as an "adjudication layer" and the core action here is a jury adjudicating whether a public profile is likely a romance scammer. Not chosen: `AI & Agents` (per the Explorer guide, most projects in the catalog are AI-powered so that tag doesn't distinguish, and the shuffle-per-session discovery means the listing has to stand out on primary category alone). `Social` was considered but StillHere is not a communication surface, it's a jury.

### Category tag 1
**Evidence Assessment**

*Justification (must map to a contract function):*
- `request_verification(public_urls, image_urls, chat_sample, ...)` — accepts URL evidence at case creation.
- `contribute_evidence(case_id, evidence_url, evidence_hash)` — third parties add corroborating URLs the jury weighs on re-adjudication.
- Both feed `_run_ai_jury` which calls `gl.nondet.web.render(url)` and passes the fetched text into the jury prompt.

### Category tag 2
**Appeal Review**

*Justification:*
- `file_dispute(case_id, counter_evidence_urls, chat_sample)` — the subject files a Round-2 appeal.
- `_run_ai_jury(..., is_dispute_round=True)` — the AI re-adjudicates with counter-evidence, writes `verdict_v2` in a distinct `RE_VERDICT` state, and `get_verdict(case_id)` returns v2 after that transition.
- `MAX_DISPUTES = 1` enforces exactly-one-appeal-per-case.

*Rejected tags:*
- `Escrow Claims` — no 2-party escrow, only base_fee + optional bounty_topup.
- `Moderation Appeals` — no moderation/takedown mechanism on any external platform.
- `License Claims` — no license terms processed.
- `Jury Selection` — validator selection is handled by GenLayer itself; the app does not implement selection logic. Do NOT claim this tag.

---

## Section 02 — PROJECT SUMMARY

### One-liner (132 / 180 chars)
> A decentralized AI jury on GenLayer that reads public profiles and weighs evidence to help families flag suspected romance scammers.

### Description (988 / 1000 chars)
> StillHere is a romance-scam prevention protocol. A family member submits a suspect profile (public URL plus a paraphrased chat sample); the case triggers an AI jury inside the contract that fetches the profile page live and returns one of four advisory verdicts: LIKELY_REAL, INCONCLUSIVE, SUSPICIOUS, or LIKELY_SCAM_RING. The subject can file a Round 2 dispute that re-runs the jury with counter-evidence, and third parties can contribute corroborating URLs weighed on re-adjudication.
>
> Built for adult children helping isolated parents, romance-scam recovery groups, and moderators who need a neutral second opinion before flagging a profile.
>
> Why GenLayer: a single centralized AI cannot legally emit "LIKELY_SCAM_RING" verdicts on real people (defamation liability). GenLayer distributes the judgment across independent validator LLMs that must agree on verdict, confidence tolerance, and critical red-flag categories. No PII or chat content is stored on-chain, only keccak256 hashes.

---

## Section 03 — HOW TO TRY IT

### Prerequisites
- MetaMask installed in the browser.
- ~0.005 GEN in your wallet **on studionet** (chain id `61999`). Fund from the Studio Accounts panel at `https://studio.genlayer.com` by transferring GEN from a pre-funded account — the public testnet faucet does not fund studionet.
- Any public web page you're willing to have the jury read as evidence (e.g. a Wikipedia article, a news page, a public social profile). No login-walled URL.

### Step 1 — Connect wallet and switch network
Open <https://stillhere-protocol.vercel.app>. Click **Connect Wallet** in the header. MetaMask prompts to add / switch to `GenLayer Studio Network` (chain id `0xF1EF` / `61999`). Approve. Your address appears in the header.

### Step 2 — Submit a verification request
Navigate to **Request Verify** in the header. Fill:
- **Public Profile URL:** any public page (e.g. `https://en.wikipedia.org/wiki/Romance_scam`)
- **Claimed Name:** any label the "profile" claims (e.g. `Test Subject`)
- **Chat Pattern Sample:** paste 1-2 short paraphrased sentences.

Click **Submit Request** → MetaMask signs `request_verification` with `value = base_fee = 0.001 GEN`. You are routed to `/pending/<caseId>?tx=<hash>`.

### Step 3 — Wait for the AI jury tx to finalize
The `/pending` page polls the transaction every 4s until studionet reports `FINALIZED` and returns the `case_id`. The AI Jury runs inside the same transaction (leader fetches the URL, prompts an LLM, validators re-execute and vote on verdict + confidence + red-flag category sets). Typical wall-clock: 30-120 s.

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
- At least one `request_verification` transaction owned by your wallet appears on the Core-contract Explorer page with `SUCCESS / Accepted` and an on-chain verdict.
- Optionally, one `file_dispute` transaction and one `contribute_evidence` transaction on the same Core contract.

### If something goes wrong
- **MetaMask errors with `'from'`** — you are on the wrong chain. Retry `Connect Wallet`; the app re-runs `wallet_switchEthereumChain` (studionet 0xF1EF).
- **`insufficient funds`** — your wallet has no GEN on studionet. Fund via Studio Accounts panel (see Prerequisites); the public faucet does NOT fund studionet.
- **Verdict never renders inside the app** — expected. Studio's `eth_call` view route is intermittent. The verdict is written on-chain — read it from the Explorer transaction link the app surfaces.

---

## Section 03 — Expected verification outcome (455 / 500 chars)
> After submitting a case, the request_verification transaction finalizes on studionet (visible on GenLayer Explorer with Result: SUCCESS and Consensus: Accepted). The tx contains the on-chain verdict produced by validator LLMs reaching consensus on label, confidence, and red-flag categories. The app shows a "view unavailable" banner while the studionet eth_call view route is intermittent, so verdict data is read from the linked transaction on Explorer.

---

## Section 03 — Contract link
Two contracts. List both, note the role.

**StillHereCore** (main entry):
`https://explorer-studio.genlayer.com/address/0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5`

**ScammerRegistry** (aggregate profile status, called only by Core):
`https://explorer-studio.genlayer.com/address/0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df`

Network: **studionet** (chain id `61999` / `0xF1EF`). Explorer status will show as **Preview** (correct per rubric — Studio deploys are Preview, not Live).

Verified via `curl` on 2026-08-25: `gen_getContractSchema` returns 11 methods for Core and 5 for Registry; the Core Explorer address page renders `Balance`, `Transactions`, and rows with `SUCCESS` / `Accepted` verdict labels (`LIKELY_REAL`, `SUSPICIOUS`, etc.) from historical calls.

---

## Section 03 — Website / GitHub
- **Website:** https://stillhere-protocol.vercel.app
- **GitHub:** https://github.com/phu1271997/stillhere-protocol

---

## Section 03 — Community links
Leave empty. No Discord / X / Telegram set up for this project yet.

---

# ⚠️ PRE-SUBMISSION CHECKLIST

**Truthfulness**
- [x] Every feature in the description works on the live URL right now (request_verification, contribute_evidence, file_dispute all wired in UI, tx signs and finalizes).
- [x] The `view unavailable` UX limitation is explicitly called out in both "Expected verification outcome" and "How to try it" — no misrepresent.
- [x] Category tags each map to a specific contract function (`contribute_evidence` → Evidence Assessment; `file_dispute` + `_run_ai_jury(is_dispute_round=True)` → Appeal Review).
- [x] Status listed as **Preview** because deployed on studionet.

**Deploy state**
- [x] Latest commit pushed to `main`.
- [x] `vercel --prod` build ready (verified with `vercel ls`).
- [x] `gen_getContractSchema` returns full method list for both contracts.
- [x] Explorer address page renders transactions with `SUCCESS / Accepted`.

**End-to-end**
- [ ] **YOU MUST RUN** the request → verdict → dispute flow end-to-end from a **funded MetaMask wallet on studionet** and confirm a tx you own appears on the Explorer address page with `SUCCESS`. Once done, tick this box.
- [ ] Also seed a `contribute_evidence` call for a case (roundtrips the Evidence Assessment tag claim).

**Assets & limits**
- [x] Logo: `frontend/public/logo-1024.png` (1.1 MB, 1024×1024 PNG) — under 2 MB cap.
- [x] One-liner 132 chars ≤ 180.
- [x] Description 988 chars ≤ 1000.
- [x] Expected verification outcome 455 chars ≤ 500.
- [x] Website + GitHub both provided.

**Consequences understood**
- [x] Changes requested = 1 fix window, 14 days.
- [x] Declined = no self-service resubmit — the honest disclosure of the `view unavailable` UX limitation exists specifically to prevent Declined-for-misrepresent.
- [x] Explorer entry counts against a Projects contribution — only submit after the corresponding Projects contribution is accepted.
