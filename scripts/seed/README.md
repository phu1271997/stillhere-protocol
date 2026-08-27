# StillHere — seed script

Submits 3 diverse verification cases to `StillHereCore` on studionet so the Explorer entry has visible
on-chain history for reviewers.

## What it creates

| # | Public URL | Expected verdict |
|---|---|---|
| A | Wikipedia "About" page | `LIKELY_REAL` or `INCONCLUSIVE` |
| B | FTC "What you need to know about romance scams" article | `INCONCLUSIVE` |
| C | Wikipedia "Romance scam" article + chat sample with scam-script pattern | `SUSPICIOUS` (E4 will downgrade `LIKELY_SCAM_RING` unless the jury reaches ≥ 85 confidence and ≥ 2 CRITICAL flags) |

The actual verdict comes from the on-chain AI Jury — this script only submits the requests.

## Prerequisites

1. Create a **throwaway** MetaMask account. Never use your primary wallet with this script.
2. Fund it from `https://studio.genlayer.com` → **Accounts** panel → transfer ~0.005 GEN from a pre-funded Studio
   account. (`base_fee = 0.001 GEN` × 3 cases + gas.)
3. Export the throwaway account's private key.

## Run

```bash
cd scripts/seed
cp .env.example .env       # paste SEED_PRIVATE_KEY into .env
npm install
node seed.mjs
```

The script prints one tx hash per case + a link to `explorer-studio.genlayer.com`. Open each and verify:

- `GENVM RESULT: SUCCESS`
- `CONSENSUS RESULT: Accepted`
- The verdict label appears in the tx `consensus_data`.

## Overrides

Any of `SEED_CORE_ADDRESS`, `SEED_RPC_URL`, `SEED_CHAIN_ID` can be overridden in `.env` — defaults target the current
studionet deployment.
