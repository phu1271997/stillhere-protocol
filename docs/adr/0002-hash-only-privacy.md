# ADR 0002 — Hash-only privacy: no plaintext PII or chat on-chain

**Status:** Accepted · **Date:** 2026-08-05

## Context

Every romance-scam case implicates two real people: a requester (often
a worried family member) and a subject (a person whose profile is being
examined). Storing either party's personal details in permanent
on-chain state creates lasting, unbounded harm:

- If the subject is innocent, the record follows them forever.
- If the requester is disclosed, they face potential retaliation from
  the scammer they reported.

We cannot rely on validator discretion — the ledger itself must not
contain the plaintext.

## Decision

All identity-linked fields are keccak256-hashed **client-side** before
the transaction is signed. Only the hash is stored on-chain. The
plaintext exists in one place only: the leader validator's LLM prompt
in-memory during that transaction. It is not persisted.

Concretely:

- `profile_hash = keccak256(url.lowercase() + "||" + name.lowercase())`
- `chat_sample_hash = keccak256(chat_sample)`
- `claimed_identity_hash = keccak256(JSON({ name, job, company, country }))`

The registry lookup by `profile_hash` also enforces this — the
Registry page cannot enumerate people; you must know the exact
plaintext to derive the same hash.

## Alternatives considered

- **Plaintext with encryption at rest** — rejected. Encryption keys
  become the new single point of failure; a compromised validator
  key exposes every case.
- **Off-chain storage (IPFS)** — deferred to a later milestone.
  IPFS still requires content addressing; the hash on-chain is what
  matters. IPFS integration adds retrieval UX without changing the
  privacy story.
- **Zero-knowledge proofs of identity** — considered, out of scope
  for this iteration. GenLayer's runtime does not currently expose a
  ZK toolkit inside contracts.

## Consequences

- **Positive**: no personal data lives on-chain in a form anyone can
  read. Adversaries who scrape the registry get hashes, not names.
  The subject's right-to-be-forgotten is preserved by construction:
  we never had their data to begin with.
- **Negative**: the *plaintext* the leader sends into the LLM is
  briefly readable to whichever validator serves as leader. This is
  the intentional cost of using an LLM at all.
- **Neutral**: users who lose track of their plaintext can no longer
  look up their own case in the registry. This is a design choice,
  not a bug — the registry is a public warning surface, not the
  requester's personal history.
