# Deployment Guide & Contract Addresses (Studionet)

## Deployed Contract Addresses (GenLayer Studionet)

| Contract | Deployed Address |
|---|---|
| **StillHereCore** | `0x2b96674AD3480e198B5704e6535bcC72Ab535A5e` |
| **ScammerRegistry** | `0xd4826725f78449CD61D33A43dBb167ABE353Cbdc` |

- **Network Name:** GenLayer Studio Network (`studionet`)
- **Chain ID:** `61999` (`0xF1EF`)
- **RPC URL:** `https://studio.genlayer.com/api`
- **Explorer:** `https://genlayer-explorer.vercel.app`

## Constructor Parameters Used

### ScammerRegistry
- No constructor parameters required.
- Action after deployment: `set_core("0x2b96674AD3480e198B5704e6535bcC72Ab535A5e")`.

### StillHereCore
- `registry_addr`: `0xd4826725f78449CD61D33A43dBb167ABE353Cbdc`
- `base_fee`: `1000000000000000` (0.001 GEN)
- `dispute_fee`: `2000000000000000` (0.002 GEN)
- `contributor_share_bps`: `3000` (30%)
- `scam_confidence_threshold`: `85`
- `scam_critical_flags_required`: `2`
