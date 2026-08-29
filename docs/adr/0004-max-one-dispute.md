# ADR 0004 — Cap disputes at one Round 2 re-adjudication

**Status:** Accepted · **Date:** 2026-08-06

## Context

Subjects deserve a right of appeal — that is what `file_dispute` and
the Round 2 AI Jury exist for. But an unbounded appeal ladder has
three pathologies:

1. **Griefing** — a well-funded actor can drown a verdict in appeals
   indefinitely.
2. **Cost drift** — validator LLM calls are the largest cost per
   case; each round doubles the total.
3. **Finality erosion** — every extra round makes it harder for
   external consumers (a family member, a moderator, a partner
   protocol) to answer "is this case decided yet?"

## Decision

Set `MAX_DISPUTES = 1` at module scope. The contract enforces this
by gating `file_dispute` on the current state:

- Legal transitions: `VERDICT → DISPUTED → RE_VERDICT` (write
  `verdict_v2`, state becomes `RE_VERDICT`).
- `file_dispute` on a case in state `RE_VERDICT` reverts with
  `UserError("case is not in VERDICT state")`.

Two verdict slots live on the case struct: `verdict_v1` and
`verdict_v2`. The read path automatically returns `v2` once the case
is in `RE_VERDICT`:

```python
def get_verdict(case_id):
    c = self.cases[case_id]
    if c.state == RE_VERDICT: return c.verdict_v2
    return c.verdict_v1
```

## Alternatives considered

- **Unbounded appeals** — rejected for griefing risk above.
- **N > 1 rounds with exponential fee** — considered. Simpler to
  ship one round now; a future ADR can lift the cap if we see
  genuine demand and pair it with an escalation-fee curve.
- **Time-decay finality** — considered. Adds too much clock-based
  reasoning to a protocol that otherwise avoids it.

## Consequences

- **Positive**: verdict finality is a bounded latency — once
  `RE_VERDICT` is reached, no further re-adjudication is possible.
- **Positive**: consumers can rely on `get_verdict` returning the
  final answer once state is `RE_VERDICT`.
- **Negative**: a subject with new evidence discovered *after* Round
  2 has no on-chain path to re-open the case. This is documented in
  the disclaimer banner as an advisory-only limit; users seeking
  further recourse are pointed at off-chain remedies.
- **Coverage**: `tests/test_dispute_flow.py::test_dispute_max_one_round`
  and `test_lifecycle_dispute_replaces_verdict_v1_in_read_path`.
