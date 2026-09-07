# Deployment Guide & Contract Addresses (Studionet)

## Current Deployed Contract Addresses

| Contract | Version | Deployed Address |
|---|---|---|
| **StillHereCore** | v0.2.16 (live) | `0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5` |
| **ScammerRegistry** | v0.2.16 (live) | `0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df` |
| **CaseAnnotations** | v0.1.0 (live 2026-09-07) | `0x7461Dd4632caF645fD435670ec5345B86b3cf530` |

### `CaseAnnotations` constructor

Single argument:

- `cooldown_secs = 60` — global per-wallet cooldown between annotation posts.
  Admin-tunable via `set_cooldown_secs(secs)`; hard bounds `[1, 86400]`.

Post-deploy: copy the deployed address into `.env` (`VITE_ANNOTATIONS_ADDRESS=…`),
push, and redeploy the frontend so the `/verdict/:id` annotation panel activates.
The annotation UI degrades gracefully when the variable is empty — the panel
renders a "contract not deployed" hint instead of a broken RPC call.

> **Redeploy pending for v0.3.0 (Milestone Phase 3).** The v0.3.0 contracts add
> new storage fields (`requester_stats`, `verdict_counts`, `paused`,
> `all_case_ids`, `all_profile_hashes`, `verdict_histogram`) and new methods
> (`refund_failed_case`, `set_paused`, `set_admin`, `unsubscribe_watcher`,
> `bump_histogram`, `get_trust_tier`, `get_requester_stats`, `get_total_cases`,
> `get_verdict_count`, `list_recent_case_ids`, `get_total_profiles`,
> `list_profile_hashes`, `get_watcher_count`, `is_watching`). Studio does not
> support in-place storage migration, so the redeploy replaces both addresses.
> After redeploy: update `.env`, `.env.example`, `frontend/src/lib/client.ts`
> fallback defaults, this file's table, `README.md`, then `git commit`,
> push to `main`, and `vercel deploy --prod`.

Explorer: [`https://explorer-studio.genlayer.com`](https://explorer-studio.genlayer.com)

## Studionet Network Parameters

- **Network Name:** GenLayer Studio Network (`studionet`)
- **Chain ID:** `61999` (`0xF1EF`)
- **RPC URL:** `https://studio.genlayer.com/api`
- **Explorer:** `https://explorer-studio.genlayer.com`

## Constructor Parameters Used

### ScammerRegistry
- No constructor parameters.
- Post-deploy action: `set_core("0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5")` from the admin wallet.

### StillHereCore
- `registry_addr` = `0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df`
- `base_fee` = `1000000000000000` (0.001 GEN)
- `dispute_fee` = `2000000000000000` (0.002 GEN)
- `contributor_share_bps` = `3000` (30%)
- `scam_confidence_threshold` = `85`
- `scam_critical_flags_required` = `2`

## Redeploy Procedure (Studio)

1. Open <https://studio.genlayer.com/run-debug>.
2. **Settings → Reset Storage → Confirm** → hard refresh (`Cmd+Shift+R`).
3. Deploy `contracts/scammer_registry.py` first. Copy the returned address as `REG_ADDR`.
4. Deploy `contracts/stillhere_core.py` with the constructor args above, using `REG_ADDR` for `registry_addr`. Copy the returned address as `CORE_ADDR`.
5. On the deployed `ScammerRegistry`, call `set_core(CORE_ADDR)` from the same admin wallet that deployed the registry.
6. For every deploy/call tx, click into the sidebar and verify **`Result: SUCCESS`** — not just `Status: FINALIZED`.
7. Update `.env`, `.env.example`, `frontend/src/lib/client.ts` fallback defaults, this file, `README.md`, and any other file that references addresses.
8. `git commit`, push to `main`, and `vercel deploy --prod` to publish the frontend against the new addresses.

## Historical Addresses

| Version | Date | Core | Registry | Annotations |
|---|---|---|---|---|
| 0.12.0 | 2026-09-07 | `0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5` | `0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df` | `0x7461Dd4632caF645fD435670ec5345B86b3cf530` |
| 0.3.0 | 2026-08-10 | `0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5` | `0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df` | — |
| 0.2.0 | 2026-08-06 | `0x7335Ffe64BE8fD82db1f2b2793583055EB8Bc805` | `0xACacF85af7532092d6D9c55E7b5EFD4B43069347` | — |
| 0.1.0 | 2026-08-05 | `0x2b96674AD3480e198B5704e6535bcC72Ab535A5e` | `0xd4826725f78449CD61D33A43dBb167ABE353Cbdc` | — |
