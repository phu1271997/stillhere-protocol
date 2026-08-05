# StillHere Security Threat Model

## 1. Threat Vectors & Mitigations

### Threat A: Adversarial Requester (False Accusation Attempt)
- **Risk**: A user attempts to defame an innocent profile.
- **Mitigation**: AI Jury requires corroborated evidence from public web renders and reverse image lookups. E4 rules downgrade high-severity verdicts unless confidence ≥ 85% and 2+ CRITICAL flags exist.

### Threat B: Prompt Injection via Chat Samples
- **Risk**: An attacker includes instructions inside `chat_sample` attempting to override LLM system rules.
- **Mitigation**: System prompt explicitly delineates input data sections, isolates chat sample text, and enforces strict JSON output parsing.

### Threat C: Privacy Leakage
- **Risk**: Plaintext storage of sensitive messages on-chain.
- **Mitigation**: Plaintext chat logs are processed purely as temporary closure variables in non-deterministic execution blocks. Only `keccak256` hashes are written to storage.

### Threat D: Reentrancy / Double Claiming
- **Risk**: Double claiming of contribution bounties.
- **Mitigation**: `contribution_claimed` mapping tracks state changes before transfer execution, and native transfers use `emit_transfer`.
