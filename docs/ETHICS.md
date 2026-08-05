# StillHere Privacy & Safety Safeguards (E1–E8)

This document details the ethical constraints and privacy architecture of the StillHere protocol.

## 1. Zero Plaintext Storage for Chat Logs (E1)
Chat logs submitted during verification requests are passed directly into non-deterministic execution blocks as closure variables (`chat_sample`). They are processed in-memory by AI validators during consensus and are NEVER stored in contract state. Only `keccak256(chat_sample)` is recorded in the case struct.

## 2. Zero Plaintext PII Storage (E2)
No full real names, phone numbers, or residential addresses are stored in contract state. Claimed identities are hashed via `computeIdentityHash` before being written to storage.

## 3. Advisory Verdict Labels (E3 & E5)
Verdicts issued by the AI Jury are restricted to advisory categories (`LIKELY_REAL`, `INCONCLUSIVE`, `SUSPICIOUS`, `LIKELY_SCAM_RING`). UI cards display explicit disclaimers clarifying that verdicts do not constitute legal determinations or formal criminal accusations.

## 4. Strict Downgrade Rules (E4)
To prevent false accusations, `LIKELY_SCAM_RING` verdicts are automatically downgraded to `SUSPICIOUS` if confidence is under 85% or if fewer than 2 `CRITICAL` severity flags are corroborated by consensus.

## 5. Right to Dispute (E6)
Subjects can file counter-evidence to trigger an appellate Round 2 AI Jury re-adjudication, ensuring a fair recourse mechanism.

## 6. Hash-Only Public Registry (E8)
The public registry maps `profile_hash` (`keccak256(url + name)`) to status records. Searching the registry requires knowledge of the canonical hash, preventing bulk harvesting of plaintext names.
