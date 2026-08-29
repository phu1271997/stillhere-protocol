# ADR 0001 — Consensus API: `gl.vm.run_nondet` with a custom validator

**Status:** Accepted · **Date:** 2026-08-05

## Context

The AI Jury produces a JSON verdict of the shape
`{ label, confidence, reason, red_flags[] }` where two of the four fields
are inherently non-deterministic:

- `reason` — free text, LLM wording varies per validator.
- `red_flags[i].evidence` — free-text phrases.

Naive consensus over the raw JSON fails: two validators arriving at the
same *judgment* still emit different strings, so `strict_eq` disagrees
even when the semantic outcome is identical. The consequence is a
failed transaction that punishes a healthy jury for wording drift.

## Decision

Wrap the leader function in `gl.vm.run_nondet(leader_fn, validator_fn)`
and hand-write `validator_fn` so it consents on *meaning*:

- `label` must match exactly (one of the 4 allowed strings).
- `|confidence_mine − confidence_leader| ≤ 10`.
- CRITICAL red-flag category set must match (order-independent).
- WARNING red-flag category set must match (order-independent).
- `reason` and `red_flags[i].evidence` are intentionally ignored.

## Alternatives considered

- **`gl.eq_principle.strict_eq`** — rejected because the payload is a
  dict with free-text fields; strict equality guarantees dissent.
- **`gl.eq_principle.prompt_comparative`** — considered but adds a
  second LLM call per validator (a comparator LLM), doubling inference
  cost and adding a second point of AI failure.
- **`gl.vm.run_nondet_unsafe`** — the SDK explicitly recommends
  `run_nondet` over `unsafe`; the unsafe variant does not sandbox
  validator errors, so a buggy validator becomes indistinguishable
  from principled disagreement.

## Consequences

- **Positive**: honest jury consensus. Validators can phrase verdicts
  freely and still agree, so the protocol tolerates the natural
  variance of LLM output. Category-set equality (not count) also
  catches a validator that swaps `STOLEN_PHOTO` for `IDENTITY_MISMATCH`
  even though both come out as "1 CRITICAL flag".
- **Negative**: `validator_fn` is now a piece of security-critical code
  that must be tested. See `tests/test_lifecycle.py::test_lifecycle_validator_semantics_ignore_freetext_but_bind_verdict`
  for the regression that locks the rule down.
- **Neutral**: the confidence tolerance (`±10`) is an arbitrary
  threshold; too tight and honest juries disagree, too loose and a
  bad validator can drag the confidence with a single vote. See ADR
  0003 for how it interacts with the `LIKELY_SCAM_RING` gate.
