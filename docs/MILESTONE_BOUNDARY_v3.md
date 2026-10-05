# Milestone boundary — v3 Requester Reputation + Watcher + Recovery

**Reviewer ask:** _"Provide the immutable final Project snapshot and a
comparison isolating this reputation, watcher and recovery update. Identify its
boundary relative to the pending annotation release, whose source already
includes these commits, so the same work is not counted twice."_

This repository has a single linear history, so the later **annotation release**
sits on top of — and therefore its source tree *contains* — the v3 reputation /
watcher / recovery commits. That is why the two look like one update. This
document pins an immutable snapshot of the v3 milestone and draws the exact
commit boundary so the shared commits are counted **once**, under v3 only.

---

## 1. Immutable final Project snapshot (v3)

The v3 milestone is frozen at the last v3 commit — nothing after it belongs to
this submission.

| Field | Value |
|---|---|
| Tag | `v0.10.0-reputation-watcher-recovery` |
| Commit SHA | `c6bbac840b0a2bed6744fe70b442f0cd19f6625a` |
| Tree SHA (content hash) | `60fb66ef0966735c237f6ded5908db2cedff685a` |
| Title | `docs: ADR-0005 reputation + SECURITY v4 + CHANGELOG 0.10.0 + Phase 3 deliverable` |
| CHANGELOG | `0.10.0` |

The tree SHA is the content-addressed hash of the whole project at that commit;
it cannot change without changing the hash, so it is a verifiable immutable
snapshot. Reproduce with:

```
git rev-parse v0.10.0-reputation-watcher-recovery^{tree}
# → 60fb66ef0966735c237f6ded5908db2cedff685a
```

---

## 2. Comparison isolating the reputation / watcher / recovery update

**Range (count THIS for the v3 milestone):** `ec67190c..c6bbac84`
(Phase-2 bundle → v3 snapshot). Three commits:

| Commit | What it adds |
|---|---|
| `a1d95421` | `feat(contracts): v0.3.0` — StillHereCore reputation stats + tier derivation, watcher lifecycle, FAILED-case recovery (refund) + withdraw, admin pause, multi-source AI |
| `97e1883e` | `feat(frontend)` — `/stats`, `/trust/:addr`, watcher UI, FAILED refund box |
| `c6bbac84` | `docs` — ADR-0005, SECURITY v4, CHANGELOG 0.10.0, Phase 3 deliverable |

**The three parts, by feature:**

- **Reputation** (ADR-0005): `RequesterStats` per wallet (`total_cases`,
  `scam_hits`, `real_hits`, `inconclusive_hits`, `failed_cases`,
  `disputes_filed`, `last_active`) updated inside the verdict-resolving tx; pure
  tier function `UNRANKED / SUSPECT / NEWCOMER / TRUSTED / GUARDIAN`. Read via
  `/trust/:addr` and `/stats`.
- **Watcher**: `subscribe_watcher` / `unsubscribe_watcher` lifecycle on a
  profile hash in `ScammerRegistry`, surfaced in the Registry UI.
- **Recovery**: `refund_failed_case` (requester reclaims `fee_paid +
  bounty_pool` when the jury never converges) + `withdrawable` ledger +
  `withdraw`, with the FAILED refund box in the frontend; admin `pause` as the
  safety backstop.

**Files changed in range** (`git diff --stat ec67190c..c6bbac84`): 16 files,
+1528 / −41 — `contracts/stillhere_core.py`, `contracts/scammer_registry.py`,
`docs/adr/0005-requester-reputation.md`, `frontend/src/pages/{Stats,Trust,Registry,VerdictDetail}.tsx`,
`tests/test_phase3_reputation.py`, CHANGELOG, SECURITY, deliverables.

---

## 3. Boundary vs the pending annotation release (do NOT double-count)

**Range belonging to the annotation release:** `c6bbac84..HEAD`. This is net-new
work that must be counted under its **own** milestone, not re-counted here:

| Commit | What it adds |
|---|---|
| `af30caed` | client-side envelope encryption for chat samples (vault) |
| `18b8de51` | public JSON API on Vercel Edge Functions + `/api` page |
| `21feccec` | ADR-0006 client-side envelope encryption, CHANGELOG 0.11.0 |
| `d10f0a34` | **new `CaseAnnotations` contract v0.1.0** (separate contract/address) |
| `2e9777a7` | `/explorer` + AnnotationBox + EN/VI i18n |
| `8219a5b9` | Atom + JSON verdict feeds + per-case SVG unfurl |
| `e6f105f4` | ADR-0007 annotations + feed, CHANGELOG 0.12.0 |
| `e1cf36ee`, `37b97ca9`, `2e3a78a2` | wire CaseAnnotations address, live-URL switch, non-tech deliverable copy |

`git diff --stat c6bbac84..HEAD`: 48 files, +3317 / −75, and a **new contract**
(`contracts/case_annotations.py`, address `VITE_ANNOTATIONS_ADDRESS`) absent
from the v3 snapshot.

### Counting rule

- **v3 (reputation / watcher / recovery):** count `ec67190c..c6bbac84` only.
- **Annotation release (pending):** count `c6bbac84..HEAD` only.
- The annotation release's tree *includes* the v3 commits solely because the
  history is linear; its **net contribution** is strictly `c6bbac84..HEAD`. No
  commit is attributed to both milestones.

---

## 4. On-chain footprint (unchanged by this clarification)

The v3 contract was already deployed to studionet; this boundary fix is
documentation only and does **not** change or redeploy the contract.

| Contract | Address (studionet) | Belongs to |
|---|---|---|
| `StillHereCore` | `0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5` | v3 |
| `ScammerRegistry` | `0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df` | v3 |
| `CaseAnnotations` | `0x7461Dd4632caF645fD435670ec5345B86b3cf530` | annotation release |
