# StillHere AI Jury Prompt Design & Consensus Verification

This document explains the prompt design for non-deterministic AI Jury evaluation in `StillHereCore`.

## 1. System Prompt Constraints
The system prompt strictly instructs LLM validators to:
- Evaluate profile patterns objectively without inventing unverified facts.
- Refrain from guessing legal real names, phone numbers, or exact home addresses.
- Output strictly formatted JSON matching the required schema.

## 2. Red Flag Taxonomy
The AI Jury categorizes indicators into standardized categories:
- `STOLEN_PHOTO`: Profile photos appear elsewhere under different names.
- `SCRIPT_LANGUAGE`: Chat patterns match known romance scam templates.
- `MONEY_REQUEST_EARLY`: Financial or cryptocurrency requests made early in relationship.
- `IDENTITY_MISMATCH`: Claimed profession or location contradicts profile data.
- `NO_DIGITAL_FOOTPRINT`: Minimal account history, recent creation.
- `URGENT_EMOTIONAL`: Manufactured emergencies requiring immediate financial help.
- `UNVERIFIABLE_JOB`: Unverifiable employer claims.
- `INCONSISTENT_TIMEZONE`: Active hours contradict claimed geographical location.

## 3. Semantic Consensus Validation
The `validator_fn` compares leader and validator outputs on:
1. Exact verdict label match (`LIKELY_REAL`, `SUSPICIOUS`, etc.).
2. Confidence score proximity (within ±12 points).
3. Exact count and category set of `CRITICAL` severity flags.
Differences in free-form prose explanations do not fail consensus, ensuring robust execution.
