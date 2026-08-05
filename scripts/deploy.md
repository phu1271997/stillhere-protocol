# Deployment Guide & Contract Addresses (Studionet)

## Deployment Steps

1. Open GenLayer Studio: `https://studio.genlayer.com/run-debug`
2. Navigate to **Settings -> Reset Storage -> Confirm**, then hard refresh.
3. Deploy `contracts/scammer_registry.py`.
4. Copy deployed `ScammerRegistry` address.
5. Deploy `contracts/stillhere_core.py` with constructor parameters:
   - `registry_addr`: `<ScammerRegistry Address>`
   - `base_fee`: `1000000000000000` (0.001 GEN)
   - `dispute_fee`: `2000000000000000` (0.002 GEN)
   - `contributor_share_bps`: `3000` (30%)
   - `scam_confidence_threshold`: `85`
   - `scam_critical_flags_required`: `2`
6. Call `set_core(stillhere_core_address)` on `ScammerRegistry`.
7. Click transaction in sidebar and verify `Result: SUCCESS`.

## Contract Addresses (GenLayer Studionet)

| Contract | Address |
|---|---|
| **ScammerRegistry** | `0x0000000000000000000000000000000000000000` (Deploy via Studio) |
| **StillHereCore** | `0x0000000000000000000000000000000000000000` (Deploy via Studio) |

*Update `.env` with actual deployed contract addresses.*
