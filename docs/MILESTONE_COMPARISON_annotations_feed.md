# Immutable comparison — final reviewed version → this Milestone's submitted commit

**Reviewer ask:** _"Provide an immutable comparison from the final version
reviewed for your Project, including its requested fixes, to this Milestone's
submitted commit. We have the repository; this comparison is needed to identify
the new work and check that it has not already been covered."_

Both endpoints below are pinned by commit SHA **and** git tree SHA (a
content-addressed hash of the whole tree), so the comparison is immutable and
independently verifiable from the repository you already have.

---

## Endpoints

| | Final reviewed version (baseline) | This Milestone's submitted commit |
|---|---|---|
| Tag | `v0.11.0-reviewed-baseline` | `v0.12.0-annotations-feed` |
| Commit SHA | `21feccecaf96ae891e0592cb271cc3568eb4b86d` | `e6f105f4831efd0e58e297bc2436a40245de4fb5` |
| Tree SHA | `66d8ec1ffbe985418ed0ef3403fe78a46b660ae5` | `14903fc8c9a692d9e36a557ae7ebd3c4b00cedb3` |
| Marker | CHANGELOG `0.11.0` (client-side encryption + public JSON API — the last reviewed milestone, including its requested fixes) | CHANGELOG `0.12.0` (Community Annotations + Public Feed) |

Reproduce the comparison:

```
git diff v0.11.0-reviewed-baseline..v0.12.0-annotations-feed --stat
# commit range: 21feccec..e6f105f4
```

---

## The new work in this Milestone (`21feccec..e6f105f4`)

`git diff --stat` → **24 files, +1864 / −43**. The whole changeset is the
Community Annotations + Public Feed milestone:

| Area | New work (all added in this range) |
|---|---|
| **New contract** | `contracts/case_annotations.py` — `CaseAnnotations` v0.1.0 (community annotations per case id: category + body hash + optional evidence URL; views `get_annotations`, `get_annotation_count`, `has_annotated`, `get_total_annotations`, `get_category_count`, `list_annotated_case_ids`). On studionet at `0x7461Dd4632caF645fD435670ec5345B86b3cf530`. |
| **Public feeds** | `api/feed.xml.ts` (Atom 1.0), `api/feed.json.ts` (JSON Feed 1.1), `api/og.svg.ts` (per-case SVG unfurl); `vercel.json` rewrites for `/feed.xml`, `/feed.json`. |
| **Explorer + UI** | `frontend/src/pages/Explorer.tsx`, `frontend/src/components/AnnotationBox.tsx`, `frontend/src/lib/annotations.ts`. |
| **i18n** | `frontend/src/lib/i18n.tsx` — EN/VI toggle. |
| **Tests + docs** | `tests/test_case_annotations.py` (11 tests), `docs/adr/0007-case-annotations-and-public-feed.md`, CHANGELOG 0.12.0. |

---

## Not already covered — proof

Every load-bearing file of this Milestone is **absent at the baseline**
(`21feccec`) and **added** in this range — it cannot have been counted under any
earlier milestone:

```
git cat-file -e 21feccec:contracts/case_annotations.py                     # → missing
git cat-file -e 21feccec:api/feed.xml.ts                                   # → missing
git cat-file -e 21feccec:frontend/src/pages/Explorer.tsx                   # → missing
git cat-file -e 21feccec:frontend/src/lib/i18n.tsx                         # → missing
git cat-file -e 21feccec:docs/adr/0007-case-annotations-and-public-feed.md # → missing
```

The preceding milestone (CHANGELOG `0.11.0`, client-side envelope encryption +
public JSON API) is entirely separate work — `frontend/src/lib/encryption.ts`,
`frontend/src/pages/Vault.tsx`, ADR-0006 — and introduced **no** contract. The
two ranges are disjoint:

- `0.11.0` (final reviewed baseline): `c6bbac84..21feccec`
- `0.12.0` (this Milestone): `21feccec..e6f105f4`

No commit is shared between them, so none of this Milestone's work overlaps the
previously reviewed version.

---

## On-chain footprint (unchanged by this clarification)

Documentation + immutable tags only; no contract change or redeploy.

| Contract | Address (studionet) | Milestone |
|---|---|---|
| `CaseAnnotations` | `0x7461Dd4632caF645fD435670ec5345B86b3cf530` | this (0.12.0) |
| `StillHereCore` | `0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5` | earlier |
| `ScammerRegistry` | `0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df` | earlier |
