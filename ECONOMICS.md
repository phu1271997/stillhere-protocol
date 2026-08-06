# StillHere — Fee & Bounty Economics

All amounts denominated in wei of native GEN (18 decimals).

## 1. Fees at a Glance

| Action | Payer | Amount | Where it lands |
|---|---|---|---|
| `request_verification` | Requester | `base_fee` (default `0.001 GEN`) + optional `bounty_topup` | `base_fee` → `treasury`; `bounty_topup` → per-case `bounty_pool` |
| `file_dispute` | Subject | `dispute_fee` (default `0.002 GEN`) | `treasury` |
| `contribute_evidence` | Contributor | 0 | — |
| `claim_contribution_bounty` | Contributor | 0 (credits `withdrawable`) | `withdrawable[contributor]` |
| `withdraw` | Contributor | 0 | Transfers `withdrawable[msg.sender]` to caller, zeroes balance first |
| `withdraw_treasury` | Admin | 0 | Transfers `amount` of `treasury` to `to_addr` |

## 2. Bounty Distribution

- `bounty_pool` is a **per-case** pool, funded by the requester at request time via `bounty_topup`.
- On a confirmed verdict of `SUSPICIOUS` or `LIKELY_SCAM_RING`, each unique contributor who registered evidence for that case can call `claim_contribution_bounty(case_id, evidence_hash)` **once**.
- Share paid per claim: `share = bounty_pool * contributor_share_bps / 10_000`. Default `contributor_share_bps = 3000` → 30% of the current pool.
- Because `share` is computed against the **current** pool after prior claims, later claimants get less. This is a deliberate first-mover incentive.
- On `LIKELY_REAL` or `INCONCLUSIVE`, `claim_contribution_bounty` reverts — no payout. The `bounty_pool` remains locked to the case with no reclaim path (see §5 open item).

## 3. Verdict-Gating Logic (E4)

The AI Jury emits one of four labels. `LIKELY_SCAM_RING` is aggressively downgraded to `SUSPICIOUS` if:
- `confidence < scam_confidence_threshold` (default `85`), OR
- number of CRITICAL red-flag categories `< scam_critical_flags_required` (default `2`).

This is enforced in `_normalize_verdict` **before** the verdict is written to storage or propagated to the registry.

## 4. Withdrawal Order-of-Operations (T4 mitigation)

`withdraw()` follows the **checks-effects-interactions** pattern with an explicit reentrancy guard:

```
1. key    = lowercase(msg.sender)
2. bal    = withdrawable[key]                # check
3. revert if bal == 0                        # check
4. withdrawable[key] = 0                     # effect FIRST
5. emit_transfer(bal) to msg.sender          # interaction LAST
```

Any reentrant call to `withdraw()` in step 5 sees `bal == 0` at step 3 and reverts. `claim_contribution_bounty` never sends native GEN, so it has no reentrancy surface.

## 5. Open Economic Questions

- **Idle bounty pool on `LIKELY_REAL`**: currently no refund path. Rationale: prevents the requester from griefing (submit-and-refund loops). Future work: time-locked refund (e.g. `bounty_pool` unlocks to requester after N days if no successful claims).
- **First-claimant advantage**: linear share against remaining pool favors early claimants. Alternative: equal split among all eligible contributors, settled after a claim window closes.
- **Dispute fee routing**: currently accrues to `treasury` regardless of dispute outcome. A future upgrade could split it — refund to subject on successful overturn, forfeit to bounty pool on upheld verdict.

## 6. Studionet Note

All amounts above are in native GEN on **studionet** (chain id `61999`). Studio account balances are funded from the Studio **Accounts** panel; there is no public faucet. Move to another network requires redeployment of both contracts.
