# ADR 0005 — Requester reputation tiers derived on-chain, not off-chain

**Status:** Accepted · **Date:** 2026-09-05

## Context

By v0.9 StillHere was accumulating real request history on studionet
but had no on-chain signal about **who** was submitting cases. A wallet
that files 20 cases where the AI Jury always returns `INCONCLUSIVE`
looks identical to a wallet that files 20 cases where the jury lands
on `LIKELY_SCAM_RING` with high confidence — both are just a list of
`request_verification` transactions from the same address.

Two consumers pushed the need for a signal:

1. **Moderators** of romance-scam recovery communities wanted a way to
   tell whether an unfamiliar wallet has a track record of surfacing
   genuine scams versus generating noise. Without that signal, every
   incoming case is treated as if it came from an anonymous stranger.
2. **The AI Jury itself** could, in a future round, weigh contributor
   evidence by the contributor's reputation — but only if that
   reputation is a first-class on-chain read, not something one has to
   scrape from tx logs.

The cheap solution — compute reputation off-chain from Explorer data
— was rejected because it breaks the "everything decisive lives
on-chain" property that the project inherited from ADR 0001 and
because it forces every consumer to reimplement the same aggregation
logic.

## Decision

Store a `RequesterStats` row per wallet inside `StillHereCore`
storage, updated inside the transaction that resolves the jury verdict
so the counter can never drift from the verdict slot. Fields:

```
total_cases       u32   # count of request_verification calls by this wallet
scam_hits         u32   # SUSPICIOUS + LIKELY_SCAM_RING outcomes
real_hits         u32   # LIKELY_REAL outcomes
inconclusive_hits u32   # INCONCLUSIVE outcomes
failed_cases      u32   # jury never converged (FAILED)
disputes_filed    u32   # dispute rounds initiated by this wallet
last_active       bigint # unix ts of the most recent write
```

Tier derivation is a **pure function** of the stats struct — no
storage read inside — so it is safe to call from any view without
touching the case map:

```
UNRANKED    total_cases == 0
SUSPECT     failed_cases >= total_cases  (all-time jury never converged)
GUARDIAN    total_cases >= 10  AND  scam_hits/total_cases >= 30%
TRUSTED     total_cases >=  3  AND  scam_hits/total_cases >= 15%
NEWCOMER    total_cases >=  1  (fallback for any other active wallet)
```

The thresholds were picked so that (a) `GUARDIAN` requires a
demonstrated track record over a non-trivial sample, and (b) the
`TRUSTED` band is reachable by a diligent good-faith user within a few
cases without also gifting the badge to anyone who filed a single
`LIKELY_SCAM_RING` case.

## Alternatives considered

- **Reputation NFT** with a mint-per-tier flow — rejected. Adds a
  second contract, introduces transferability (the whole point of
  wallet-bound reputation is that it can't be traded), and mints
  garbage NFTs into wallets that never asked for them.
- **Off-chain Dune / SubQuery indexer** — rejected. Breaks the "everything
  decisive lives on-chain" invariant and depends on an external
  service the protocol does not control.
- **Cross-wallet reputation** (allow a delegate to inherit reputation)
  — rejected for v0.10. Delegation opens up a Sybil-attack surface
  and is not worth the extra complexity before we have real usage
  numbers to calibrate against.
- **Weighting the AI Jury verdict by requester reputation** —
  considered but explicitly deferred. Feeding requester reputation
  into the verdict itself could reinforce false positives: a
  `GUARDIAN`-badge wallet reporting an innocent profile would tilt
  the jury against the subject. Reputation must stay advisory to
  consumers, not an input to the verdict function.

## Consequences

- **Positive**: any consumer — the app, an external index, another
  contract — can read a wallet's reputation in one view call, and the
  read is derived from the same storage that the verdict pipeline
  writes.
- **Positive**: the tier function has no dependencies and is
  exercised by 6 example tests + 1 hypothesis property (see
  `tests/test_phase3_reputation.py`).
- **Negative**: `RequesterStats` grows one row per unique requester
  wallet. In the studionet parameter space (small) this is negligible;
  a mainnet deployment would want to revisit whether it should be a
  packed struct.
- **Coverage**: `tests/test_phase3_reputation.py` — tier bands + edge
  cases. `contracts/stillhere_core.py::_bump_requester_verdict` +
  `_bump_failed` + `get_trust_tier` + `get_requester_stats` cover the
  storage side.
