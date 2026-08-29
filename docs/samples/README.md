# Sample scenarios

Three synthetic case payloads shaped to trigger different verdict
labels. Each file mirrors exactly what `request_verification` receives
after the frontend hashes the fields.

Use them as fixtures for demos, seed script templates, or manual
test-driving of the flow. **These are synthetic — no real person is
identified in any of them.**

| File | Expected verdict |
|---|---|
| `case-a-likely-real.json` | `LIKELY_REAL` / `INCONCLUSIVE` |
| `case-b-inconclusive.json` | `INCONCLUSIVE` |
| `case-c-suspicious.json` | `SUSPICIOUS` (E4 downgrade from `LIKELY_SCAM_RING` unless the jury reaches confidence ≥ 85 AND ≥ 2 CRITICAL flags) |

The actual verdict is decided by the on-chain AI Jury, not by these
fixtures. The "expected" column reflects what the evidence should
push the jury toward — the whole point of validator consensus is that
we cannot fabricate the verdict client-side.

The seed script at [`scripts/seed/seed.mjs`](../../scripts/seed/seed.mjs)
consumes an in-source version of these scenarios directly.
