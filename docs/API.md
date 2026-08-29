# StillHere — Contract API Reference

Live studionet deployments:

| Contract | Address |
|---|---|
| `StillHereCore` | `0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5` |
| `ScammerRegistry` | `0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df` |

Both contracts are Python Intelligent Contracts running under GenLayer
GenVM. All method payloads on the wire are RLP-encoded
`[functionName, JSON.stringify(args)]` — the same encoding both
`genlayer-js` and the `sendGenLayerTransaction` helper in this repo
emit.

Every write method must be signed by MetaMask on chain id `61999`.
View methods take a `from` field (usually `0x0…0`) — see the note at
the end of this doc about the studionet view-execution intermittency.

---

## StillHereCore

### `__init__(registry_addr: Address, base_fee: bigint, dispute_fee: bigint, contributor_share_bps: u16, scam_confidence_threshold: u8, scam_critical_flags_required: u8)`

Constructor. Sets the linked Registry, the two fees, the contributor
bounty share (basis points, 3000 = 30%), and the E4 thresholds (see
ADR 0003). `admin` is captured from `gl.message.sender_address`.

### `request_verification(profile_hash, public_urls, image_urls, claimed_identity_hash, chat_sample, chat_sample_hash, bounty_topup) → str  [payable]`

Opens a new case. Charges `base_fee + bounty_topup` from
`msg.value`. Runs the AI Jury synchronously in the same transaction
and returns the new `case_id` as a decimal string.

Guards:
- `public_urls` in `[1, 6]`
- `image_urls` in `[0, 3]`
- `chat_sample.length` in `[0, 5000]`
- `bounty_topup ≥ 0`
- `paid ≥ base_fee + bounty_topup`
- `profile_hash` non-empty after canonicalization

Emits state transition `→ VERDICT` (or `→ FAILED` if the jury errors
out — canary mismatch, JSON parse failure, or all URL fetches
failing).

### `contribute_evidence(case_id_str, evidence_url, evidence_hash)`

Third-party evidence submission for a case that is not `FAILED`.
`evidence_hash` is dedup-checked per case — the same hash cannot be
registered twice for the same case. Weighed by the jury on any
subsequent `file_dispute`.

### `file_dispute(case_id_str, counter_evidence_urls, chat_sample)  [payable]`

Subject-initiated Round 2 re-adjudication. Requires:
- Case must be in state `VERDICT` (see ADR 0004).
- `counter_evidence_urls` in `[1, 5]`.
- `chat_sample.length ≤ 5000`.
- `msg.value ≥ dispute_fee`.

Transitions state `VERDICT → DISPUTED`, re-runs the AI Jury with
`is_dispute_round=True`, writes `verdict_v2`, transitions
`DISPUTED → RE_VERDICT`. `get_verdict` returns `verdict_v2` from
this point on.

### `claim_contribution_bounty(case_id_str, evidence_hash)`

Only the address that originally submitted the contribution can
claim. Requires:
- Verdict on the case is `SUSPICIOUS` or `LIKELY_SCAM_RING` (a
  positive-verdict case has no active bounty).
- `bounty_pool > 0`.
- Bounty not already claimed for this `evidence_hash`.

Credits `withdrawable[contributor]` (pull-payment pattern per ADR to
be added).

### `withdraw()`

Pull-payment path. Zeroes `withdrawable[caller]` **before** issuing
`emit_transfer(value=…)`, defeating reentrancy by construction.

### `subscribe_watcher(profile_hash)`

Forwards to `ScammerRegistry.subscribe_watcher` with the caller's
address.

### `withdraw_treasury(to_addr, amount)`

Admin only. Amount must be positive and ≤ current treasury.

### `get_case(case_id_str) → Case  [view]`

Returns the full `Case` struct (requester, hashes, URLs, both
verdict slots, dispute evidence, state). Raises
`UserError("case not found")` if unknown.

### `get_verdict(case_id_str) → Verdict  [view]`

Returns `verdict_v2` if state is `RE_VERDICT`, else `verdict_v1`.

### `list_cases_by_profile(profile_hash) → DynArray[str]  [view]`

Every case id whose profile matches `_canon_hash(profile_hash)`.

### `get_withdrawable(holder) → bigint  [view]`

Pull-payment balance for the given address.

---

## ScammerRegistry

### `__init__()`

Sets `admin = msg.sender`. Registry does not know about Core yet.

### `set_core(core_addr)  [admin only]`

Sets the address whose calls are trusted to write to `statuses` and
`watchers`. Called once, right after Core is deployed.

### `upsert_status(profile_hash, verdict_label, confidence)  [only Core]`

Updates the aggregate row for `profile_hash`. Monotonic in
`highest_confidence` and `case_count`; verdict label follows the
newest highest-confidence winner. See
`tests/test_registry_cache.py::test_registry_lower_confidence_does_not_downgrade_label`
for the anti-whitewash invariant.

### `subscribe_watcher(profile_hash, watcher)  [only Core]`

Appends `watcher` to the watchers list for `profile_hash`.

### `get_status(profile_hash) → ProfileStatus  [view]`

Returns the aggregate row or a default
`{ verdict_label: "UNKNOWN", highest_confidence: 0, case_count: 0, last_updated: 0 }`
if the profile is unknown.

---

## Known runtime limitation — studionet view intermittency

`eth_call` for the `[view]` methods on both contracts currently
returns `execution failed / exit_code 1` on studionet — a
Studio-runtime issue, not a contract bug. Writes are unaffected:
transactions finalize, the AI Jury runs, and verdicts land on-chain.
The frontend surfaces this with a "view unavailable" banner + an
Explorer link on Registry and VerdictDetail. Every verdict field is
also present in the transaction's `consensus_data` on
`explorer-studio.genlayer.com`.
