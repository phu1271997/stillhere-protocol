#!/usr/bin/env node
/**
 * StillHere seed script — creates 3 diverse cases on studionet so the
 * Explorer entry has a real state history for reviewers to inspect.
 *
 * SECURITY:
 *   This script signs live transactions from a private key you provide.
 *   Use a THROWAWAY wallet funded from the Studio Accounts panel with just
 *   enough GEN to cover 3 base_fees (~0.004 GEN) — never your main wallet.
 *
 * USAGE:
 *   1. Fund a fresh wallet on studionet via studio.genlayer.com Accounts panel.
 *   2. Export its private key.
 *   3. Copy .env.example to .env in this directory, fill SEED_PRIVATE_KEY.
 *   4. From the repo root:
 *        cd scripts/seed && npm install && node seed.mjs
 *   5. Each case emits a tx hash. Open on GenLayer Explorer to verify
 *      Result: SUCCESS + on-chain verdict.
 *
 * The script picks 3 distinct public URLs shaped to trigger different
 * AI Jury verdicts:
 *   - LIKELY_REAL / INCONCLUSIVE  →  a stable, boring reference page
 *     (Wikipedia article on romance scams — no scam signals, no personal claim)
 *   - INCONCLUSIVE                →  a public "how romance scams work" news article
 *   - SUSPICIOUS / LIKELY_SCAM_RING (with chat sample matching scam script)
 *     →  a public article that itself lists common scam-script phrases
 *
 * The verdict is determined by the validators; this script only submits.
 */

import { createWalletClient, http, defineChain, keccak256, toBytes, toRlp, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as dotenvConfig } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, ".env") });

const PK = process.env.SEED_PRIVATE_KEY;
if (!PK || !/^0x[0-9a-fA-F]{64}$/.test(PK)) {
  console.error("Set SEED_PRIVATE_KEY=0x… in scripts/seed/.env (throwaway wallet only).");
  process.exit(1);
}

const CORE = process.env.SEED_CORE_ADDRESS || "0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5";
const RPC = process.env.SEED_RPC_URL || "https://studio.genlayer.com/api";
const CHAIN_ID = Number(process.env.SEED_CHAIN_ID || 61999);

const studionet = defineChain({
  id: CHAIN_ID,
  name: "GenLayer Studio Network",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const account = privateKeyToAccount(PK);
const client = createWalletClient({ account, chain: studionet, transport: http(RPC) });

const BASE_FEE = 1_000_000_000_000_000n; // 0.001 GEN

const CASES = [
  {
    label: "Case A — reference / expected LIKELY_REAL or INCONCLUSIVE",
    publicUrls: ["https://en.wikipedia.org/wiki/Wikipedia:About"],
    imageUrls: [],
    claimedName: "Reference Subject A",
    claimedJob: "researcher",
    claimedCompany: "public",
    claimedCountry: "US",
    chatSample: "Discussed the weather. No requests. Long-standing profile.",
  },
  {
    label: "Case B — thin evidence / expected INCONCLUSIVE",
    publicUrls: ["https://www.consumer.ftc.gov/articles/what-you-need-know-about-romance-scams"],
    imageUrls: [],
    claimedName: "Reference Subject B",
    claimedJob: "engineer",
    claimedCompany: "offshore",
    claimedCountry: "UK",
    chatSample: "Recent account. Limited public activity. No specific claims yet.",
  },
  {
    label: "Case C — scam-script pattern / expected SUSPICIOUS",
    publicUrls: ["https://en.wikipedia.org/wiki/Romance_scam"],
    imageUrls: [],
    claimedName: "Reference Subject C",
    claimedJob: "deployed_soldier",
    claimedCompany: "unverifiable",
    claimedCountry: "Yemen",
    chatSample:
      "Fell in love immediately. Need urgent help with wire transfer to unlock inheritance. Cannot video call due to operations. Please trust me and send crypto.",
  },
];

function profileHash(url, name) {
  return keccak256(toBytes(url.trim().toLowerCase() + "||" + name.trim().toLowerCase()));
}
function chatHash(s) { return keccak256(toBytes(s)); }
function identityHash(id) {
  return keccak256(toBytes(JSON.stringify({
    n: id.claimedName.trim().toLowerCase(),
    j: id.claimedJob.trim().toLowerCase(),
    c: id.claimedCompany.trim().toLowerCase(),
    k: id.claimedCountry.trim().toLowerCase(),
  })));
}

function encodeCall(functionName, args) {
  return toRlp([toHex(functionName), toHex(JSON.stringify(args))]);
}

async function submitCase(c) {
  const ph = profileHash(c.publicUrls[0], c.claimedName);
  const ch = chatHash(c.chatSample);
  const ih = identityHash(c);
  const data = encodeCall("request_verification", [
    ph, c.publicUrls, c.imageUrls, ih, c.chatSample, ch, 0,
  ]);
  console.log(`\n▶ ${c.label}`);
  console.log(`  profile_hash: ${ph}`);
  const hash = await client.sendTransaction({
    to: CORE,
    data,
    value: BASE_FEE,
  });
  console.log(`  tx: ${hash}`);
  console.log(`  explorer: https://explorer-studio.genlayer.com/tx/${hash}`);
  return hash;
}

console.log(`Seed wallet: ${account.address}`);
console.log(`Core:        ${CORE}`);
console.log(`Chain id:    ${CHAIN_ID}`);
console.log(`Base fee:    ${BASE_FEE} wei per case (0.001 GEN)`);
console.log(`Total:       ${BASE_FEE * BigInt(CASES.length)} wei (${CASES.length} cases)\n`);

const hashes = [];
for (const c of CASES) {
  try {
    hashes.push(await submitCase(c));
    await new Promise((r) => setTimeout(r, 8000)); // pace so validator consensus catches up between cases
  } catch (e) {
    console.error(`  FAILED: ${e?.shortMessage || e?.message || String(e)}`);
    hashes.push(null);
  }
}

console.log("\nSubmitted tx hashes:");
for (const [i, h] of hashes.entries()) {
  console.log(`  ${i + 1}. ${h ?? "(failed)"}`);
}
console.log("\nOpen each on https://explorer-studio.genlayer.com/tx/<hash> to verify Result: SUCCESS + on-chain verdict.");
