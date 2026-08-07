# Deployment Guide & Contract Addresses (Studionet)

## Current Deployed Contract Addresses (v0.2.0, 2026-08-06)

| Contract | Deployed Address |
|---|---|
| **StillHereCore** | `0x7335Ffe64BE8fD82db1f2b2793583055EB8Bc805` |
| **ScammerRegistry** | `0xACacF85af7532092d6D9c55E7b5EFD4B43069347` |

Explorer: [`https://explorer-studio.genlayer.com`](https://explorer-studio.genlayer.com)

## Studionet Network Parameters

- **Network Name:** GenLayer Studio Network (`studionet`)
- **Chain ID:** `61999` (`0xF1EF`)
- **RPC URL:** `https://studio.genlayer.com/api`
- **Explorer:** `https://explorer-studio.genlayer.com`

## Constructor Parameters Used

### ScammerRegistry
- No constructor parameters.
- Post-deploy action: `set_core("0x7335Ffe64BE8fD82db1f2b2793583055EB8Bc805")` from the admin wallet (the wallet that deployed the registry).

### StillHereCore
- `registry_addr` = `0xACacF85af7532092d6D9c55E7b5EFD4B43069347`
- `base_fee` = `1000000000000000` (0.001 GEN)
- `dispute_fee` = `2000000000000000` (0.002 GEN)
- `contributor_share_bps` = `3000` (30%)
- `scam_confidence_threshold` = `85`
- `scam_critical_flags_required` = `2`

## Redeploy Procedure (Studio)

1. Open <https://studio.genlayer.com/run-debug>.
2. **Settings → Reset Storage → Confirm** → hard refresh (`Cmd+Shift+R`).
3. Load and deploy `contracts/scammer_registry.py` first. Copy the returned address as `REG_ADDR`.
4. Load and deploy `contracts/stillhere_core.py` with the constructor args above, using `REG_ADDR` for `registry_addr`. Copy the returned address as `CORE_ADDR`.
5. On the deployed `ScammerRegistry` instance, call `set_core(CORE_ADDR)` from the same admin wallet that deployed the registry.
6. For every deploy/call tx, click into the sidebar and verify **`Result: SUCCESS`** — not just `Status: FINALIZED`.
7. Update `.env`, `.env.example`, `frontend/src/lib/client.ts` fallback defaults, this file, `README.md`, and `ARCHITECTURE.md` (if it references addresses) with `REG_ADDR` and `CORE_ADDR`.
8. `git commit`, push to `main`, and `vercel deploy --prod` to publish the frontend against the new addresses.

## Historical Addresses

| Version | Date | Core | Registry |
|---|---|---|---|
| 0.2.0 | 2026-08-06 | `0x7335Ffe64BE8fD82db1f2b2793583055EB8Bc805` | `0xACacF85af7532092d6D9c55E7b5EFD4B43069347` |
| 0.1.0 | 2026-08-05 | `0x2b96674AD3480e198B5704e6535bcC72Ab535A5e` | `0xd4826725f78449CD61D33A43dBb167ABE353Cbdc` |
