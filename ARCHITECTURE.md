# StillHere — Architecture

## 1. System Overview

StillHere is a two-contract Intelligent Contract system deployed on **GenLayer studionet** with a Vite+React frontend that signs transactions via MetaMask and reads state via `genlayer-js`.

```mermaid
flowchart TB
    subgraph Browser["Browser (Vercel-hosted)"]
        UI["React UI<br/>(pages/*)"]
        JS["genlayer-js client<br/>(lib/client.ts)"]
        MM["MetaMask"]
    end

    subgraph Studionet["GenLayer Studionet — chainId 61999"]
        RPC["studio.genlayer.com/api"]
        Core["StillHereCore<br/>Intelligent Contract"]
        Reg["ScammerRegistry<br/>Intelligent Contract"]
        Web[("gl.nondet.web.*<br/>public web fetch")]
        LLM[("gl.nondet.exec_prompt<br/>LLM inference")]
    end

    UI -->|read state| JS
    JS -->|eth_call| RPC
    UI -->|write tx| MM
    MM -->|eth_sendTransaction| RPC
    RPC --> Core
    Core -->|IRegistry.upsert_status| Reg
    Core -->|leader_fn / validator_fn| Web
    Core -->|leader_fn / validator_fn| LLM
```

## 2. Contract Boundaries

### StillHereCore ([`contracts/stillhere_core.py`](contracts/stillhere_core.py))
- Owns: cases, evidence contributions, contributor→address map, bounty accounting.
- Runs the AI Jury (`_run_ai_jury`) via `gl.vm.run_nondet(leader_fn, validator_fn)`.
- Cross-calls `ScammerRegistry.upsert_status` after every verdict, `subscribe_watcher` on user request.

### ScammerRegistry ([`contracts/scammer_registry.py`](contracts/scammer_registry.py))
- Owns: profile_hash → aggregate status, watchers per profile.
- Only accepts writes from the core contract (address-checked in `upsert_status`/`subscribe_watcher`).
- Registered after deploy via `set_core(core_addr)` — admin-only, one-time.

## 3. Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor R as Requester
    participant UI as Frontend
    participant MM as MetaMask
    participant Core as StillHereCore
    participant Web as gl.nondet.web
    participant LLM as gl.nondet.exec_prompt
    participant Reg as ScammerRegistry

    R->>UI: fill form (URLs + chat sample)
    UI->>UI: keccak256 chat_sample, identity fields
    UI->>MM: eth_sendTransaction(request_verification, base_fee+topup)
    MM->>Core: tx (payable)
    Core->>Core: create Case (state=PENDING)
    Core->>Web: render N public URLs, strip canary
    Core->>Web: reverse-image lookup image URLs
    Core->>LLM: exec_prompt(multi-perspective + canary)
    LLM-->>Core: JSON verdict (leader)
    Core->>LLM: validator_fn — re-runs, compares semantics
    LLM-->>Core: bool agree/disagree
    Core->>Core: normalize E4, write verdict_v1
    Core->>Reg: upsert_status(profile_hash, label, confidence)
    Core-->>UI: tx finalized
    UI->>Core: readContract(get_verdict)
    Core-->>UI: Verdict
```

## 4. Dispute (Round 2) Flow

```mermaid
sequenceDiagram
    actor S as Subject
    participant UI as Frontend
    participant Core as StillHereCore
    participant Jury as AI Jury (nondet)

    S->>UI: submit counter-evidence URLs
    UI->>Core: file_dispute(dispute_fee)
    Core->>Core: state = DISPUTED
    Core->>Jury: _run_ai_jury(is_dispute_round=True)
    Jury-->>Core: verdict_v2
    Core->>Core: state = RE_VERDICT
    Note over Core: get_verdict now returns verdict_v2
```

## 5. Pull-Payment Bounty Flow

```mermaid
sequenceDiagram
    actor C as Contributor
    participant Core as StillHereCore

    C->>Core: contribute_evidence(case_id, url, evidence_hash)
    Note over Core: registers contributor
    Note over Core: (case is later adjudicated SUSPICIOUS/LIKELY_SCAM_RING)
    C->>Core: claim_contribution_bounty(case_id, evidence_hash)
    Core->>Core: credit withdrawable[contributor] += share
    Core->>Core: bounty_pool -= share
    Note over Core: no native transfer yet
    C->>Core: withdraw()
    Core->>Core: zero balance FIRST
    Core-->>C: emit_transfer(bal)
```

Two-step withdraw defeats reentrancy: the withdrawable balance is zeroed before the native transfer executes.

## 6. Storage Layout

### StillHereCore
| Field | Type | Purpose |
|---|---|---|
| `cases` | `TreeMap[str, Case]` | Case id (stringified) → full case record |
| `profile_to_cases` | `TreeMap[str, DynArray[str]]` | Canonical profile_hash → case ids |
| `contributions` | `TreeMap[str, DynArray[str]]` | Case id → evidence URLs |
| `contributors` | `TreeMap[str, TreeMap[str, Address]]` | Case id → (evidence_hash → contributor) |
| `contribution_claimed` | `TreeMap[str, TreeMap[str, bool]]` | Case id → (evidence_hash → claimed) |
| `withdrawable` | `TreeMap[str, bigint]` | Contributor address (lowercase) → GEN owed |
| `registry` | `Address` | ScammerRegistry contract |
| `admin` | `Address` | Deployer, treasury withdrawer only |
| `treasury` | `bigint` | Accumulated fees (base + dispute) |
| `next_case_id` | `bigint` | Monotonic case counter |
| `base_fee`, `dispute_fee` | `bigint` | Native GEN fees per action |
| `contributor_share_bps` | `u16` | Basis points of bounty_pool paid per confirmed contribution |
| `scam_confidence_threshold` | `u8` | E4 downgrade threshold (default 85) |
| `scam_critical_flags_required` | `u8` | E4 downgrade threshold (default 2) |

### ScammerRegistry
| Field | Type | Purpose |
|---|---|---|
| `statuses` | `TreeMap[str, ProfileStatus]` | profile_hash → aggregate |
| `watchers` | `TreeMap[str, DynArray[Address]]` | profile_hash → watcher list |
| `core` | `Address` | Only address allowed to write |
| `admin` | `Address` | Sets `core`, one-time |

## 7. Frontend Data Flow

```mermaid
flowchart LR
    User --> RequestVerify
    RequestVerify -->|keccak256 client-side| hash.ts
    RequestVerify -->|eth_sendTransaction| client.ts
    client.ts -->|MetaMask signs| studionet[(studionet)]
    Pending -->|poll via readContract| studionet
    VerdictDetail -->|readContract| studionet
    Dispute -->|eth_sendTransaction| studionet
    Registry -->|readContract get_status| studionet
```

- **Single source of truth for chain config**: `frontend/src/lib/client.ts` defines `studionet` via `viem.defineChain(...)` pointing at `https://studio.genlayer.com/api` (chain id `61999`). `frontend/src/lib/wallet.ts` imports the same constants for `wallet_addEthereumChain`, so there is no drift between MetaMask's network and the read client.
- **Writes**: always go through `sendGenLayerTransaction` → `window.ethereum.request('eth_sendTransaction')` so MetaMask signs; no private keys touch the bundle.
- **Reads**: go through `client.readContract` which resolves to `eth_call` against studionet RPC.

## 8. Deployment

See [`scripts/deploy.md`](scripts/deploy.md) for the current deployed addresses and constructor arguments.
