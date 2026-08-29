# ADR 0003 — E4: auto-downgrade `LIKELY_SCAM_RING` under thresholds

**Status:** Accepted · **Date:** 2026-08-06

## Context

The strongest verdict label — `LIKELY_SCAM_RING` — reads almost as an
accusation. If an LLM emits it on thin evidence, we hand out a
reputational verdict that will follow a real person indefinitely.

Two failure modes we have to rule out:

1. **Low confidence** — the LLM guessed. Verdicts under 85% confidence
   are historically noisy and should not be labelled as strongly as
   verdicts backed by unambiguous evidence.
2. **Single critical flag** — one CRITICAL red flag is not a
   converging pattern, it is a coincidence. Scam-ring accusations
   should rest on multiple independent signals.

## Decision

Implement rule **E4** in the pure function `_normalize_verdict(...)`
called after JSON extraction but before the verdict is written to
storage. The rule:

```
if raw_label == "LIKELY_SCAM_RING":
    if confidence < scam_confidence_threshold  # default 85
        or critical_flag_count < scam_critical_flags_required  # default 2
    :
        label = "SUSPICIOUS"
```

Thresholds are contract constructor parameters (not code constants),
so they can be re-tuned in a future deployment without a refactor.

Enforcement is deterministic — every validator arrives at the same
downgrade decision from the same LLM output, so consensus is not at
risk. The downgrade happens after `_extract_json` and before the
validator agreement check.

## Alternatives considered

- **Delete `LIKELY_SCAM_RING` entirely** — rejected. There is a real
  category of verdict that deserves the strongest label; erasing it
  weakens the vocabulary uniformly and pushes reviewers to over-read
  `SUSPICIOUS`.
- **Human review before publishing `LIKELY_SCAM_RING`** — considered,
  rejected: a human review queue introduces a trusted party and
  defeats the point of decentralized adjudication.
- **Softer wording** — considered but rejected: verdict vocabulary is
  fixed at four labels; softening the wording without changing the
  substance is theatre.

## Consequences

- **Positive**: the worst-case defamation risk is bounded. A jury
  cannot emit `LIKELY_SCAM_RING` without meeting both bars.
- **Positive**: because E4 fires *after* validator consensus on
  `label` matches, we cannot silently disagree on the downgrade
  outcome.
- **Negative**: some genuine scam-ring cases get flagged
  `SUSPICIOUS` instead. This is the correct trade — false negatives
  on the label field cost less than false positives against a real
  person.
- **Coverage**: locked down by
  `tests/test_edge_cases.py::test_confidence_below_scam_threshold_downgrades`
  and `test_confidence_at_or_above_threshold_holds`.
