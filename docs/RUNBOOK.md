# StillHere — Operations Runbook

A one-file runbook for deploy, incident triage, and common operator
tasks. Everything here is verified against the studionet v0.7.0
deployment.

---

## 1. Deploy checklist (new / redeploy)

Studio-based, hosted studionet. See `scripts/deploy.md` for the full
version history and constructor parameters that were used.

1. Open <https://studio.genlayer.com/run-debug>.
2. **Settings → Reset Storage → Confirm** → hard refresh (`Cmd+Shift+R`).
3. Deploy `contracts/scammer_registry.py` first. Copy the returned
   address as `REG_ADDR`.
4. Deploy `contracts/stillhere_core.py` with:
   - `registry_addr = REG_ADDR`
   - `base_fee = 1_000_000_000_000_000` (0.001 GEN)
   - `dispute_fee = 2_000_000_000_000_000` (0.002 GEN)
   - `contributor_share_bps = 3000` (30%)
   - `scam_confidence_threshold = 85`
   - `scam_critical_flags_required = 2`
5. On the deployed `ScammerRegistry`, call `set_core(CORE_ADDR)` from
   the same admin wallet that deployed the registry.
6. For every tx: click into the sidebar and verify
   `Result: SUCCESS` — not just `Status: FINALIZED`.
7. Update these files with the new addresses and commit:
   - `.env` and `.env.example`
   - `frontend/src/lib/client.ts` (fallback defaults)
   - `README.md` (contracts table)
   - `docs/API.md` (contracts table)
   - `scripts/deploy.md` (add row to history)
   - `deliverables/SUBMISSION.md` (Contract link section)
   - `frontend/src/pages/HowItWorks.tsx` (AddressCard defaults)
8. `git commit`, push to `main`, then `vercel deploy --prod`.

---

## 2. Post-deploy smoke test

```bash
# 1) contract schema loads
curl -s -X POST https://studio.genlayer.com/api \
  -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"gen_getContractSchema\",\"params\":[\"$CORE_ADDR\"]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d['result']['methods'].keys()))"

# 2) frontend routes 200
for p in / /how-it-works /cases /contribute/0 /registry /request; do
  curl -s -o /dev/null -w "$p: %{http_code}\n" "https://stillhere-protocol.vercel.app$p"
done

# 3) tests pass
make fast    # deterministic suite, 63 tests, milliseconds
```

If step 1 returns an error, the contract is not deployed to that
address. Re-check the address string; do not proceed until schema
loads.

---

## 3. Common incidents

### 3.1 `execution failed / exit_code 1` on any view call

Studio's `eth_call` route is intermittently unable to execute
view methods on our contracts. Known and disclosed to reviewers.

**No action required.** The frontend already surfaces a
"view unavailable" banner + retry button + Explorer link. Writes
are unaffected. If the issue persists longer than 24 h, escalate to
the GenLayer team; the workaround is to read verdicts from the
Explorer transaction detail page directly (the `consensus_data`
field contains the leader's LLM output).

### 3.2 `insufficient funds` on request_verification

The signing wallet has no GEN on studionet. Fund via
`https://studio.genlayer.com` → **Accounts** panel by transferring
GEN from a pre-funded account. The public testnet faucet does not
fund studionet — that is Bradbury/Asimov and is a separate chain.

### 3.3 MetaMask throws `'from'` RPC error

MetaMask is on a chain other than 61999 (0xF1EF). Clicking Connect
re-runs `wallet_switchEthereumChain` via `frontend/src/lib/wallet.ts`.
If the chain is not yet added, `wallet_addEthereumChain` runs
instead.

### 3.4 `Result: ERROR` on a supposedly-succeeded tx

Open the tx on `explorer-studio.genlayer.com`. Read the
`consensus_data.receipt.result` field — it is base64-encoded and
usually contains a Python traceback. Common causes:
- The AI Jury emitted a payload missing the canary → tx path routes
  to `FAILED` state.
- The URL fed into `web.render` returned a 4xx/5xx AND all URLs did
  so → same `FAILED` path.

Fix by re-submitting the case with a different URL if the failure
was fetch-related, or by waiting and retrying if the jury LLM was
under load.

---

## 4. Emergency operations

**There is no pause switch in v0.7.0.** Emergency stop and rate
limiting are planned for a Phase 2 milestone. If a critical bug is
found, the interim mitigations are:

1. Announce on GitHub (open an issue with `[SECURITY]` prefix).
2. Update the site DisclaimerBanner to include a "do not submit new
   cases" line.
3. Push a frontend change that disables the request form and
   `vercel --prod` deploy.
4. Contract state itself cannot be paused in this version.

---

## 5. Rotating the admin wallet

The `admin` field on both contracts is set from
`gl.message.sender_address` at construction. There is no
`set_admin` method. Rotating the admin means redeploying — follow
§1 with the new admin wallet as the deployer.

---

## 6. Backup / restore

Every on-chain contract state is public and re-derivable from the
transaction history. There is no separate backup step. The local
per-browser `localStorage` cache in the frontend (case metadata for
the `/cases` page) is per-user and not authoritative — clearing
site data drops it, but every case still lives on-chain.

---

## 7. Contact & escalation

| Issue | Where to open |
|---|---|
| Bug / feature request | https://github.com/phu1271997/stillhere-protocol/issues |
| Security disclosure | See `SECURITY.md` for the report path |
| GenLayer platform issue | GenLayer Discord / support channel |
