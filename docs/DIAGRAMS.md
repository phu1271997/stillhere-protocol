# StillHere — Sequence Diagrams

Companion to [`ARCHITECTURE.md`](../ARCHITECTURE.md). Read that first
for the static picture; this doc has the runtime flows.

---

## 1. Request → Verdict (happy path)

```mermaid
sequenceDiagram
  autonumber
  participant U as User (MetaMask)
  participant FE as Frontend (Vite/React)
  participant RPC as studionet RPC
  participant Core as StillHereCore
  participant Reg as ScammerRegistry
  participant Val as Validator quorum

  U->>FE: fill form (URL, name, chat sample)
  FE->>FE: keccak256 hash chat, identity, profile
  FE->>U: MetaMask signature prompt (0.001 GEN)
  U->>RPC: eth_sendRawTransaction (request_verification)
  RPC->>Core: request_verification(...)
  Core->>Core: charge base_fee, allocate case_id
  Core->>Val: _run_ai_jury(case_id, chat_sample, False)
  Val->>Val: leader fetches URLs via gl.nondet.web.render
  Val->>Val: leader prompts LLM w/ canary
  Val->>Val: validators re-execute + vote
  Val-->>Core: agreed verdict { label, confidence, red_flags }
  Core->>Core: _normalize_verdict (E4)
  Core->>Core: write verdict_v1, state = VERDICT
  Core->>Reg: upsert_status(profile_hash, label, confidence)
  RPC-->>FE: tx FINALIZED, result = case_id
  FE->>FE: route to /verdict/{case_id}
  FE->>RPC: eth_call get_case(case_id)  (currently returns exit_code 1)
  FE->>FE: fall back to Explorer tx link
```

---

## 2. Dispute → Round 2 re-adjudication

```mermaid
sequenceDiagram
  autonumber
  participant S as Subject (MetaMask)
  participant FE as Frontend
  participant Core as StillHereCore
  participant Val as Validator quorum

  S->>FE: open /dispute/{case_id}, paste counter URLs
  FE->>S: MetaMask signature prompt (0.002 GEN)
  S->>Core: file_dispute(case_id, counter_urls, chat_sample)
  Core->>Core: assert state == VERDICT
  Core->>Core: charge dispute_fee, state = DISPUTED
  Core->>Val: _run_ai_jury(case_id, chat_sample, True)
  Val->>Val: canary is now SH-D-{case_id:08d}-CANARY
  Val->>Val: prompt includes counter_evidence + is_dispute_round note
  Val-->>Core: agreed verdict_v2
  Core->>Core: write verdict_v2, state = RE_VERDICT
  FE->>Core: get_verdict(case_id) now returns v2
```

---

## 3. Contribution → Bounty pull-payment

```mermaid
sequenceDiagram
  autonumber
  participant C as Contributor
  participant Core as StillHereCore

  C->>Core: contribute_evidence(case_id, url, hash)
  Core->>Core: dedup evidence_hash per case
  Core->>Core: append URL, record contributor address

  Note over Core: (Later) a dispute round re-runs the jury<br/>weighing the contributed URLs.
  Note over Core: If final verdict is SUSPICIOUS or LIKELY_SCAM_RING:

  C->>Core: claim_contribution_bounty(case_id, hash)
  Core->>Core: assert caller == recorded contributor
  Core->>Core: share = bounty_pool * contributor_share_bps / 10000
  Core->>Core: withdrawable[C] += share, bounty_pool -= share
  C->>Core: withdraw()
  Core->>Core: bal = withdrawable[C]; withdrawable[C] = 0
  Core->>C: emit_transfer(value=bal)
```

The zero-then-transfer order in `withdraw()` is the reentrancy
defence — any callback into `withdraw()` sees a zero balance and
reverts on the `nothing to withdraw` guard.

---

## 4. Case state machine

```mermaid
stateDiagram-v2
  [*] --> PENDING: request_verification
  PENDING --> VERDICT: AI jury OK
  PENDING --> FAILED: canary mismatch / bad JSON / all fetches failed
  VERDICT --> DISPUTED: file_dispute (subject)
  DISPUTED --> RE_VERDICT: AI jury Round 2 OK
  RE_VERDICT --> [*]: get_verdict returns verdict_v2
  VERDICT --> [*]: get_verdict returns verdict_v1
  FAILED --> [*]: get_verdict raises
```

Only one dispute round is allowed (see ADR 0004).
