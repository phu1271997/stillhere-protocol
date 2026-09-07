# ADR 0006 — Client-side envelope encryption for chat samples

**Status:** Accepted · **Date:** 2026-09-06

## Context

ADR 0002 committed the protocol to hash-only privacy on-chain: the
contract only ever sees `keccak256(chat_sample)`, never the plaintext.
That property is intact — the AI Jury reads the chat sample inside the
non-deterministic function, hashes it before touching storage, and the
plaintext is scrubbed of the canary token before being fed to the LLM.

Two workflows still needed plaintext transport:

1. A requester wants to hand the full chat log to *one specific*
   reviewer (a moderator in a recovery community, a family lawyer, a
   fraud analyst) without exposing it to the AI Jury or leaving it
   unencrypted on any server. Copy/paste through Signal works but is
   fragile and undermines the "everything auditable is on-chain"
   posture — there is no artifact tying the shared plaintext back to
   the case.
2. A subject filing a dispute wants to submit exculpatory counter
   evidence that includes conversation excerpts. The current dispute
   flow feeds counter URLs into the jury, but the plaintext of a
   sensitive counter-example (medical records, private emails) has no
   privacy-preserving hand-off path.

We wanted a primitive that:

- **Sends nothing to any StillHere server** — pure client-side crypto.
- Produces an artifact that a downstream verifier can independently
  content-address (paired with the on-chain `chat_sample_hash` this
  is a soft binding: reviewer decrypts, computes `keccak256`,
  compares — no trust in the sender needed).
- Uses primitives that ship in every modern browser without a
  dependency.
- Does **not** try to be a full messaging protocol — this is a
  one-shot "hand this file to the intended reviewer" primitive.

## Decision

Ship a `frontend/src/lib/encryption.ts` module + `/vault` page that
performs envelope encryption entirely in the browser via WebCrypto:

- **KEM**: ephemeral ECDH over P-256. A fresh keypair per envelope,
  so no two envelopes share a derived key.
- **KDF**: HKDF-SHA-256 with an info tag of `stillhere-envelope-v1`.
- **DEM**: AES-256-GCM with a 12-byte random nonce per envelope.
- **Recipient key management**: the reviewer generates a keypair from
  the same `/vault` page. Private JWK stays in the reviewer's
  `localStorage`; public JWK is copied and shared out-of-band with
  senders.
- **Envelope content hash**: SHA-256 over the canonical
  (`Object.keys().sort()`) JSON of the envelope. Suitable as a
  content-address for external pinning (Web3.Storage / Pinata /
  self-hosted IPFS).

Storage: private keys are never sent anywhere. `localStorage` under
the key `stillhere:encryption:kp:v1` on the recipient's browser only.
Users are told explicitly that clearing site data destroys the key.

## Alternatives considered

- **Native X25519 (curve25519)** — WebCrypto support for X25519 is
  still shipping in some browsers as of 2026-09; P-256 is available
  everywhere. Semantically identical for a one-shot envelope; the
  performance delta is invisible for the payload sizes we care about.
- **libsodium-js / tweetnacl** — additional ~40 kB bundle for
  primitives WebCrypto already provides. Rejected on bundle-size and
  dependency grounds.
- **Lit Protocol** — considered. Requires a decentralised network
  running on Ethereum L1 that the StillHere protocol has no other
  dependency on. Too heavy for a one-shot artifact.
- **PGP** — mailto: workflows are dead. Rejected.
- **Uploading the envelope to StillHere infrastructure** — rejected
  on principle. This whole layer exists specifically to avoid a
  server-side plaintext or ciphertext deposit.

## Consequences

- **Positive**: full envelope encryption + decryption + content hash
  in ~200 lines, no runtime dependency beyond the browser.
- **Positive**: the AI Jury on-chain path is unchanged — this is a
  strictly additive off-chain artifact. `chat_sample_hash` on-chain
  still binds the sender to a specific plaintext, and the envelope's
  `profile_hash` field links back to the case.
- **Negative**: no forward secrecy beyond the per-envelope ephemeral.
  If the recipient's device is compromised *after* an envelope is
  received, past envelopes to that recipient can be decrypted. We
  document this in the vault page; a follow-up ADR can consider
  ratcheting if we ever operate a session channel.
- **Negative**: no signature over the envelope. A sender's identity
  is only asserted by "the sender picked this recipient's public key
  and encoded the case's `profile_hash` into the envelope". This is
  intentional — an out-of-band signature (e.g. wallet signature over
  the envelope hash) can be layered later without changing this ADR.
- **Coverage**: `frontend/src/lib/encryption.test.mjs` — five
  round-trip and negative tests exercised by `make test-frontend`.
