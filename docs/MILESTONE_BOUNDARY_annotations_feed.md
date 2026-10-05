# Milestone boundary — Community Annotations + Public Feed release (v0.12.0)

**Reviewer ask:** _"Provide the comparison from the final reviewed Project
snapshot to this update and identify any work unique to this submission beyond
`875b571d-b387-4e18-88cb-cafdc60146bb`. Both currently describe the same
annotation and feed release, so we need that boundary before deciding novelty
and overlap."_

This repository has a single linear history, so each release's tree contains the
commits of everything before it. This document pins the final reviewed snapshot,
gives the exact comparison to this update, and draws the boundary so the
annotation + feed work is counted **once**.

---

## 1. Final reviewed Project snapshot (baseline)

The state last reviewed **before** this annotation + feed update — i.e. the end
of the preceding milestone (`0.11.0` client-side encryption + public JSON API).

| Field | Value |
|---|---|
| Commit SHA | `21feccecaf96ae891e0592cb271cc3568eb4b86d` |
| Tree SHA (content hash) | `66d8ec1ffbe985418ed0ef3403fe78a46b660ae5` |
| Title | `docs: ADR-0006 client-side envelope encryption + CHANGELOG 0.11.0` |
| CHANGELOG | `0.11.0` |

## 2. Immutable snapshot of THIS update (annotation + feed, v0.12.0)

| Field | Value |
|---|---|
| Tag | `v0.12.0-annotations-feed` |
| Commit SHA | `e6f105f4831efd0e58e297bc2436a40245de4fb5` |
| Tree SHA (content hash) | `14903fc8c9a692d9e36a557ae7ebd3c4b00cedb3` |
| Title | `docs: ADR-0007 annotations + feed + i18n + CHANGELOG 0.12.0 + deliverable` |
| CHANGELOG | `0.12.0` |

Verify:
```
git rev-parse v0.12.0-annotations-feed^{tree}   # → 14903fc8...
```

---

## 3. Comparison: final reviewed snapshot → this update

**Range (this submission = annotation + feed):** `21feccec..e6f105f4` —
24 files, **+1864 / −43**. The on-chain centerpiece is a brand-new contract.

| Area | What this update adds |
|---|---|
| **New contract** | `contracts/case_annotations.py` (v0.1.0) — `CaseAnnotations`, a standalone deploy: community annotations keyed by case id with category + body hash + optional evidence URL; views `get_annotations`, `get_annotation_count`, `has_annotated`, `get_total_annotations`, `get_category_count`, `list_annotated_case_ids`. On studionet at `0x7461Dd4632caF645fD435670ec5345B86b3cf530`. |
| **Public feeds** | `api/feed.xml.ts` (Atom 1.0, last 50 verdicts), `api/feed.json.ts` (JSON Feed 1.1), `api/og.svg.ts` (per-case SVG unfurl card); `vercel.json` rewrites for `/feed.xml`, `/feed.json`. |
| **Explorer + UI** | `frontend/src/pages/Explorer.tsx`, `components/AnnotationBox.tsx`, `lib/annotations.ts`, EN/VI `lib/i18n.tsx`. |
| **Tests + docs** | `tests/test_case_annotations.py` (11 tests), ADR-0007, CHANGELOG 0.12.0. |

---

## 4. Boundary vs `875b571d…` (no double-count)

The annotation + feed release is a self-contained unit (§3). It is **distinct
from the adjacent `0.11.0` milestone** (client-side envelope encryption + public
JSON API), which is a different feature set:

- **`0.12.0` annotation + feed (THIS submission):** `21feccec..e6f105f4` —
  `case_annotations.py`, feeds, explorer, i18n. Centerpiece: the `CaseAnnotations`
  contract.
- **`0.11.0` encryption + public API (separate milestone):**
  `c6bbac84..21feccec` — `frontend/src/lib/encryption.ts`, `pages/Vault.tsx`,
  public JSON API, ADR-0006. 19 files, +1423/−5. **No new contract.**

### Counting rule — map `875b571d` to one of the two

- **If `875b571d` is the `0.12.0` annotation + feed release** (the likely case,
  since both "describe the same annotation and feed release"): it is the **same
  body of work** as this submission. Count it **once**. The only material in the
  current tree beyond the `e6f105f4` snapshot is non-feature deployment wiring +
  documentation (`e1cf36ee` wire CaseAnnotations studionet address, `37b97ca9` /
  `ea52a160` live-URL fix, `2e3a78a2` non-technical deliverable copy, `0946e5fe`
  v3 boundary doc) — **no novel product feature beyond `875b571d`**.
- **If `875b571d` is instead the `0.11.0` encryption + public-API milestone:**
  then the entire `0.12.0` annotation + feed track above — including the new
  `CaseAnnotations` contract — is **unique to this submission** and does not
  overlap `875b571d`.

Either way, no commit is attributed to both milestones: `0.11.0` is
`c6bbac84..21feccec`, `0.12.0` is `21feccec..e6f105f4`. The ranges are disjoint.

---

## 5. On-chain footprint (unchanged by this clarification)

Documentation + immutable-snapshot only; no contract change or redeploy.

| Contract | Address (studionet) | Milestone |
|---|---|---|
| `CaseAnnotations` | `0x7461Dd4632caF645fD435670ec5345B86b3cf530` | 0.12.0 annotation + feed (this) |
| `StillHereCore` | `0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5` | earlier (reputation/watcher/recovery) |
| `ScammerRegistry` | `0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df` | earlier |
