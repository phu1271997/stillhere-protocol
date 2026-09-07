# ADR 0007 — Community annotations contract + public verdict feed + bilingual UI

**Status:** Accepted · **Date:** 2026-09-07

## Context

Through v0.11 the protocol had a strong single-case flow: submit a
suspect profile, get a verdict, dispute or contribute evidence. What
it did *not* have was:

1. **A way for a third party to add short structured context to an
   existing case.** `contribute_evidence` already accepts a URL, but
   there is no place to say "I am also a witness — this profile
   contacted me too" or "this case matches phrasing from case #4",
   let alone a category taxonomy for such a claim.
2. **A discoverable index of cases.** The frontend renders individual
   cases and a per-user local list. Anyone who did not submit a case
   themselves had no route to browse recent verdicts.
3. **A subscribable public feed.** No way for a moderator, journalist,
   or watchdog organisation to follow the verdict stream from their
   own RSS reader, notification bot, or workflow tool.
4. **Vietnamese-language coverage.** The core user base for this
   protocol includes Vietnamese-speaking families reporting scams
   targeting Vietnamese victims abroad. An English-only UI was a
   material accessibility barrier.

## Decision

Ship four coordinated additions, none of which touch the existing
Core / Registry / Annotations code paths destructively:

### 1. New standalone contract `CaseAnnotations`

- Deployed **once alongside** Core + Registry. Does not couple back to
  either; the frontend passes the `case_id` string across.
- Storage: `annotations: TreeMap[case_id, DynArray[Annotation]]`,
  `author_index: TreeMap[case_id, TreeMap[addr_str, bool]]`,
  `last_post_ts: TreeMap[addr_str, bigint]`, category counters, and a
  global annotated-case index for pagination.
- **Spam mitigation**:
  - One annotation per wallet per case (per-case dedupe map).
  - Global per-wallet cooldown (default 60 s, admin-tunable).
  - Category is a closed enum of 5 tags (`WITNESS`,
    `INHERITED_PATTERN`, `COUNTER_CONTEXT`, `CORROBORATE`,
    `SAFETY_TIP`) — free-text categories were rejected on
    prompt-injection grounds.
- **Privacy**: annotation body is hashed on the client with
  `keccak256`; only the hex hash + an optional canonical URL land in
  storage. Matches the E1/E2 hash-only invariant.
- **Ops**: admin-controlled `set_paused`, `set_cooldown_secs`,
  `set_admin`. Pause halts posting but does not affect reads.

### 2. `/explorer` page — browsable public case index

Merges local cases (from `caseStore` localStorage) with a chain-side
paginated read of `list_recent_case_ids` (from v0.3.0 Core). Rows are
deduped, sorted reverse-chron, and filterable by verdict + free-text
search over case id / requester address / public URL. Every row has
a copy-share affordance producing `https://.../verdict/:id`.

Falls back gracefully to local rows only when the v0.3.0 endpoint is
not yet on the live contract — with a labelled hint, no fake data.

### 3. Public verdict feeds — Atom + JSON + OG cards

Three new Vercel Edge functions:

- **`/api/feed.xml`** — Atom 1.0, last 50 case verdicts, subscribable
  from every mainstream feed reader.
- **`/api/feed.json`** — JSON Feed 1.1 companion (same reads).
- **`/api/og/case/:id.svg`** — deterministic per-case 1200×630 SVG
  unfurl card, ready to serve as `<meta property="og:image">`. Verdict
  label drives the palette; brand mark and Explorer link included.

Pretty URLs (`/feed.xml`, `/feed.json`, `/api/og/case/:id.svg`) are
wired via `vercel.json` rewrites so subscribers don't need to know the
`?id=` query form.

### 4. Bilingual UI — English + Vietnamese

`frontend/src/lib/i18n.tsx` provides a small, dependency-free i18n
context (`useI18n`, `t()`), a `LanguageToggle` chip in the header,
and translation dictionaries for the hero, nav, `/explorer`, and the
annotation UI. Locale is persisted in `localStorage`
(`stillhere:locale:v1`) and auto-detected on first visit for
`navigator.language.startsWith('vi')`.

Non-hero pages fall back to English strings; the goal is not a
full-app translation but a first-language landing for Vietnamese
visitors + first-class translations for the most-used surfaces.

## Alternatives considered

- **Add annotations to the existing Core contract** — rejected. Core
  is already the largest contract in the deploy and storage-migration
  on Studio is a full redeploy. Keeping annotations isolated means a
  category change or a cooldown tweak does not touch verdicts.
- **Free-text annotation category** — rejected on prompt-injection
  grounds. If the AI Jury ever weights annotations in a future
  version, an open-string category becomes an attack surface.
- **Store the annotation plaintext on-chain** — rejected. Matches
  ADR 0002. Only `keccak256(body)` and an optional URL are stored.
- **RSS instead of Atom** — the two are close, but Atom's per-entry
  `<updated>` vs `<published>` distinction matches the request→dispute
  →re-verdict lifecycle better than RSS's single `<pubDate>`.
- **PNG-generated OG cards via `@vercel/og`** — considered. SVG is
  ~3 kB, cache-friendly, deterministic, and every modern unfurler
  handles it. PNG would add a compile step and a ~50 kB per-card
  serving cost.
- **`react-i18next`** — considered. ~30 kB gzip, more feature-rich
  than we need. Own 200-line implementation covers the two-locale case
  with zero dependency.

## Consequences

- **Positive**: three brand-new user-facing surfaces (`/explorer`,
  annotations panel on `/verdict/:id`, EN/VI toggle) + three new API
  routes (`/api/feed.xml`, `/api/feed.json`, `/api/og/case/:id.svg`) +
  one new deployable contract. All additive.
- **Positive**: annotations complement the existing `contribute_evidence`
  flow. Evidence is a URL to be fetched by the AI Jury on a future
  dispute round; an annotation is a *human-readable* community signal
  that reads regardless of jury re-runs.
- **Negative**: `CaseAnnotations` is a new deploy. Currently un-linked
  from the frontend until `VITE_ANNOTATIONS_ADDRESS` is set. UI
  degrades gracefully — the annotation panel renders a "contract not
  deployed" hint instead of a broken RPC call.
- **Coverage**: `tests/test_case_annotations.py` — 11 helper-level
  tests exercising the category enum, address canonicalization, and
  bounds. On-chain state (dedupe, cooldown, pagination) covered by
  the studionet integration path after deploy.
