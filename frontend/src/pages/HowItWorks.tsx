import React from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu,
  ShieldCheck,
  Scale,
  Lock,
  Globe,
  Bot,
  Check,
  ArrowRight,
  Database,
  AlertTriangle,
  Key,
  FileCheck,
  Layers,
  Wallet,
  ExternalLink,
  Info,
  Hash,
  UsersRound,
  BadgeDollarSign,
} from 'lucide-react';
import {
  CORE_ADDRESS,
  REGISTRY_ADDRESS,
  explorerAddressUrl,
} from '../lib/client';

export const HowItWorks: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-24">
      {/* ============= HEADER ============= */}
      <header className="text-center flex flex-col items-center gap-3">
        <span className="text-xs uppercase tracking-wider font-semibold text-brand-400">Protocol reference</span>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">How StillHere Works</h2>
        <p className="text-slate-400 max-w-2xl text-sm sm:text-base leading-relaxed">
          A decentralized AI Jury for romance-scam verification, built on GenLayer's Optimistic Democracy. This page
          walks through the full end-to-end protocol: request creation, on-chain web reads, LLM consensus,
          verdict normalization, dispute rounds, contributor bounties, and the registry aggregate.
        </p>
      </header>

      {/* ============= ARCHITECTURE OVERVIEW ============= */}
      <section className="flex flex-col gap-6">
        <SectionTitle
          eyebrow="Architecture"
          title="Two contracts, one adjudication loop"
          subtitle="StillHereCore holds cases and runs the AI Jury; ScammerRegistry keeps the per-profile aggregate that the Registry page reads."
        />

        <div className="glass-panel p-6 sm:p-8 font-mono text-xs sm:text-sm text-slate-300 overflow-x-auto">
          <pre className="whitespace-pre">{`  Requester ─▶  StillHereCore                    ScammerRegistry
                ├─ request_verification()          ├─ upsert_status()      (only Core)
                ├─ contribute_evidence()           ├─ subscribe_watcher()  (only Core)
                ├─ file_dispute()                  └─ get_status()         (public view)
                ├─ _run_ai_jury()  ────nondet──▶
                │    ├─ gl.nondet.web.render(url)
                │    ├─ gl.nondet.exec_prompt(...)
                │    └─ gl.vm.run_nondet(leader_fn, validator_fn)
                └─ get_case() / get_verdict()     (public views)`}</pre>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AddressCard label="StillHereCore" addr={CORE_ADDRESS} />
          <AddressCard label="ScammerRegistry" addr={REGISTRY_ADDRESS} />
        </div>
      </section>

      {/* ============= CORE PILLARS ============= */}
      <section className="flex flex-col gap-6">
        <SectionTitle
          eyebrow="Design pillars"
          title="Four properties a centralized service can't offer"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Pillar
            icon={<Globe className="w-5 h-5" />}
            color="brand"
            title="1. Direct on-chain web access"
            body="Validators call gl.nondet.web.render(url) inside the non-deterministic block. No off-chain oracle, no proxy service to trust — the same code that ends up in consensus is the code that fetched the page."
          />
          <Pillar
            icon={<UsersRound className="w-5 h-5" />}
            color="emerald"
            title="2. Independent AI jury"
            body="Each validator runs its own LLM against the same evidence. The verdict emerges from convergence, not from any single provider's opinion."
          />
          <Pillar
            icon={<Scale className="w-5 h-5" />}
            color="amber"
            title="3. Appellate dispute"
            body="A subject can pay dispute_fee and trigger file_dispute — the jury re-runs with counter-evidence, writes verdict_v2, and the read path automatically switches to it."
          />
          <Pillar
            icon={<Lock className="w-5 h-5" />}
            color="teal"
            title="4. Privacy by construction (E1–E8)"
            body="Chat samples and PII are keccak256-hashed client-side before the transaction is signed. Only hashes touch state. Registry lookups are hash-only — plaintext names never appear."
          />
        </div>
      </section>

      {/* ============= JURY MECHANICS ============= */}
      <section className="flex flex-col gap-6">
        <SectionTitle
          eyebrow="Consensus mechanics"
          title="How the validators actually reach agreement"
          subtitle="Ordinary strict_eq consensus fails on free-text AI output — two validators will phrase the same verdict differently. StillHere uses a custom validator_fn that consents on meaning."
        />

        <ol className="flex flex-col gap-4">
          <JurySteps
            n={1}
            icon={<Bot className="w-5 h-5" />}
            title="Leader executes the jury prompt"
            body="The leader validator fetches every profile URL (up to 6) via gl.nondet.web.render, hits the reverse-image lookup for each image URL (up to 3), and pastes the sanitized text into a structured prompt that embeds a per-case canary."
          />
          <JurySteps
            n={2}
            icon={<Key className="w-5 h-5" />}
            title="Canary defense"
            body={
              <>
                The prompt requires the LLM to echo the string{' '}
                <code className="font-mono text-brand-300">SH-R-&#123;case_id:08d&#125;-CANARY</code> (or{' '}
                <code className="font-mono text-brand-300">SH-D-</code> for dispute rounds) verbatim in{' '}
                <code className="font-mono text-brand-300">response.canary</code>. All user-supplied evidence text
                is scrubbed of the canary string before entering the prompt. If the model omits or alters the canary,
                the leader returns <code className="font-mono text-rose-300">error: CANARY_MISMATCH</code> and the case
                is moved to FAILED — a prompt-injection attempt cannot silently steer the verdict.
              </>
            }
          />
          <JurySteps
            n={3}
            icon={<UsersRound className="w-5 h-5" />}
            title="Validators re-execute independently"
            body="Every other validator runs leader_fn on its own LLM. Web fetches are deterministic (URL text tends to be stable within seconds); LLM inference is not. That's where the custom validator_fn earns its keep."
          />
          <JurySteps
            n={4}
            icon={<Check className="w-5 h-5" />}
            title="Semantic agreement rule"
            body={
              <>
                A validator's output is treated as AGREEING with the leader iff:
                <ul className="mt-2 flex flex-col gap-1 pl-4 list-disc marker:text-brand-400">
                  <li><code className="font-mono text-brand-300">label</code> is identical</li>
                  <li><code className="font-mono text-brand-300">|confidence_mine − confidence_leader| ≤ 10</code></li>
                  <li>CRITICAL-severity red-flag category set matches (order-independent)</li>
                  <li>WARNING-severity red-flag category set matches (order-independent)</li>
                </ul>
                Free-text <code className="font-mono text-brand-300">reason</code> and <code className="font-mono text-brand-300">evidence</code> fields are intentionally ignored — that is what lets validators phrase the same verdict differently without disagreement.
              </>
            }
          />
          <JurySteps
            n={5}
            icon={<FileCheck className="w-5 h-5" />}
            title="E4 normalization before write"
            body={
              <>
                Before the verdict is committed, <code className="font-mono text-brand-300">_normalize_verdict</code>{' '}
                enforces rule E4: <code className="font-mono text-rose-300">LIKELY_SCAM_RING</code> is
                auto-downgraded to <code className="font-mono text-amber-300">SUSPICIOUS</code> if
                <code className="font-mono text-slate-100"> confidence &lt; 85</code> OR the number of
                CRITICAL flags &lt; 2. Applied deterministically on-chain — not a validator opinion.
              </>
            }
          />
        </ol>
      </section>

      {/* ============= RED FLAGS ============= */}
      <section className="flex flex-col gap-6">
        <SectionTitle
          eyebrow="Red-flag taxonomy"
          title="Eight allowed categories, three severities"
          subtitle="The prompt hard-codes this list. Any category outside it is rejected as BAD_LABEL, so validators can't invent new categories to sneak around the semantic-agreement rule."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FlagRow category="STOLEN_PHOTO" body="Profile photo matches an unrelated identity (reverse-image lookup hit)." />
          <FlagRow category="SCRIPT_LANGUAGE" body="Language patterns known from published scam-script archives." />
          <FlagRow category="MONEY_REQUEST_EARLY" body="Financial ask before a plausible in-person meeting timeline." />
          <FlagRow category="IDENTITY_MISMATCH" body="Claimed identity fields contradict the fetched profile page." />
          <FlagRow category="NO_DIGITAL_FOOTPRINT" body="Profile is recent, isolated, or lacks corroborating public presence." />
          <FlagRow category="URGENT_EMOTIONAL" body="Rushed emotional escalation, love-bombing, staged emergencies." />
          <FlagRow category="UNVERIFIABLE_JOB" body="Occupation claim (offshore engineer, deployed soldier, etc.) that cannot be checked." />
          <FlagRow category="INCONSISTENT_TIMEZONE" body="Message-time patterns inconsistent with the claimed location." />
        </div>

        <div className="glass-card p-5 flex items-start gap-3 text-xs">
          <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-slate-200">Severity levels</span>
            <span className="text-slate-400">
              Each red flag carries <code className="font-mono text-brand-300">CRITICAL</code>,
              <code className="font-mono text-brand-300"> WARNING</code>, or
              <code className="font-mono text-brand-300"> INFO</code>. CRITICAL is what E4 counts.
              WARNING contributes to validator-set matching but not to the LIKELY_SCAM_RING threshold.
              INFO is context-only.
            </span>
          </div>
        </div>
      </section>

      {/* ============= FLOWS ============= */}
      <section className="flex flex-col gap-6">
        <SectionTitle eyebrow="End-to-end flows" title="Three paths through the protocol" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FlowCard
            icon={<ArrowRight className="w-4 h-4" />}
            title="Request → Verdict"
            steps={[
              'request_verification (payable, base_fee = 0.001 GEN)',
              '_run_ai_jury runs synchronously in the same tx',
              'verdict_v1 written; state = VERDICT',
              'registry upsert_status called via IRegistry',
            ]}
          />
          <FlowCard
            icon={<Scale className="w-4 h-4" />}
            title="Dispute → Round 2"
            steps={[
              'file_dispute (payable, dispute_fee = 0.002 GEN)',
              'counter_evidence_urls stored on the case',
              '_run_ai_jury re-runs with is_dispute_round=True',
              'verdict_v2 written; state = RE_VERDICT; get_verdict returns v2',
              'MAX_DISPUTES = 1 — one appeal per case',
            ]}
          />
          <FlowCard
            icon={<BadgeDollarSign className="w-4 h-4" />}
            title="Contribution → Bounty"
            steps={[
              'contribute_evidence(case_id, url, hash)',
              'jury weighs contributed URLs on re-adjudication',
              'If verdict lands SUSPICIOUS / LIKELY_SCAM_RING → claim_contribution_bounty',
              'Credits withdrawable[contributor]; withdraw() zeroes-then-transfers (reentrancy-safe pull payment)',
            ]}
          />
        </div>
      </section>

      {/* ============= STATE MACHINE ============= */}
      <section className="flex flex-col gap-6">
        <SectionTitle eyebrow="Case state machine" title="Five states, deterministic transitions" />

        <div className="glass-panel p-6 sm:p-8 font-mono text-xs sm:text-sm text-slate-300 overflow-x-auto">
          <pre className="whitespace-pre">{`  request_verification
        │
        ▼
   ┌─────────┐   AI jury OK    ┌──────────┐   file_dispute   ┌──────────┐
   │ PENDING │ ───────────────▶│ VERDICT  │ ────────────────▶│ DISPUTED │
   └─────────┘                 └──────────┘                  └──────────┘
        │  canary / JSON /                                        │
        │  ALL fetches fail                                       │  AI jury OK
        ▼                                                         ▼
   ┌─────────┐                                              ┌────────────┐
   │ FAILED  │                                              │ RE_VERDICT │
   └─────────┘                                              └────────────┘

  get_verdict(case_id):
      state == RE_VERDICT  →  verdict_v2
      state == VERDICT     →  verdict_v1
      state == FAILED      →  raises UserError`}</pre>
        </div>
      </section>

      {/* ============= FEES & BOUNTIES ============= */}
      <section className="flex flex-col gap-6">
        <SectionTitle eyebrow="Economics" title="Fees, treasury, bounties" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeeCard label="base_fee" value="0.001 GEN" body="Charged on request_verification. Credits contract treasury." />
          <FeeCard label="dispute_fee" value="0.002 GEN" body="Charged on file_dispute (Round 2 re-adjudication)." />
          <FeeCard label="contributor_share_bps" value="3000" body="30% of bounty_pool per approved contributor claim (basis points)." />
        </div>

        <div className="glass-card p-5 flex items-start gap-3 text-xs">
          <BadgeDollarSign className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-slate-200">Pull-payment safety</span>
            <span className="text-slate-400">
              <code className="font-mono text-brand-300">claim_contribution_bounty</code> credits{' '}
              <code className="font-mono text-brand-300">withdrawable[contributor]</code> rather than transferring
              inline. Actual payout happens in a separate <code className="font-mono text-brand-300">withdraw()</code>{' '}
              call that zeroes the balance <em>before</em> calling <code className="font-mono text-brand-300">emit_transfer</code> — reentrancy-safe by construction.
            </span>
          </div>
        </div>
      </section>

      {/* ============= PRIVACY ============= */}
      <section className="flex flex-col gap-6">
        <SectionTitle eyebrow="Privacy safeguards" title="E1–E8 in plain English" />

        <div className="flex flex-col gap-3">
          <EthicsRow tag="E1" title="No plaintext chat" body="Chat samples are keccak256-hashed client-side before the tx is signed. Only the hash is written on-chain." />
          <EthicsRow tag="E2" title="PII hashing" body="Claimed name / job / company / country are combined and hashed as a canonical identity blob. Plain fields never appear in state." />
          <EthicsRow tag="E3" title="Advisory label vocabulary" body="Only four verdict labels are allowed. No 'guilty' or 'confirmed scammer' — every label reads as advisory." />
          <EthicsRow tag="E4" title="Auto-downgrade threshold" body="LIKELY_SCAM_RING requires confidence ≥ 85 and ≥ 2 CRITICAL flags. Below either bar, the contract writes SUSPICIOUS instead." />
          <EthicsRow tag="E5" title="Disclaimer on every screen" body="A persistent banner tells users the verdict is advisory, not a legal determination." />
          <EthicsRow tag="E6" title="Subject right of appeal" body="A subject can trigger a Round 2 AI Jury with counter-evidence. verdict_v2 replaces verdict_v1 on the read path." />
          <EthicsRow tag="E8" title="Hash-only registry lookup" body="Registry search takes a profile_hash, not a plaintext name — the Registry page cannot be used to enumerate people." />
        </div>
      </section>

      {/* ============= WALLET & COST ============= */}
      <section className="flex flex-col gap-6">
        <SectionTitle
          eyebrow="Wallet & funding"
          title="What you need before opening a case"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WalletCard
            icon={<Wallet className="w-5 h-5" />}
            title="MetaMask on chain id 61999"
            body="Click Connect in the header. The app runs wallet_switchEthereumChain to add or switch to GenLayer Studio Network (chainId 0xF1EF) automatically."
          />
          <WalletCard
            icon={<BadgeDollarSign className="w-5 h-5" />}
            title="~0.005 GEN funded"
            body="Enough for one request (0.001) + one dispute (0.002) + gas. Fund from the Studio Accounts panel at studio.genlayer.com — the public testnet faucet does NOT fund studionet."
          />
        </div>
      </section>

      {/* ============= HONEST LIMITATION ============= */}
      <section className="flex flex-col gap-4">
        <SectionTitle eyebrow="Known limitation" title="Studio view route intermittency" />

        <div className="glass-card p-5 flex items-start gap-3 border border-amber-700/40">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1.5 text-sm text-slate-300 leading-relaxed">
            <span>
              Studio's <code className="font-mono text-brand-300">eth_call</code> view route is currently returning
              <code className="font-mono text-rose-300"> exit_code 1</code> for both StillHere contracts — a Studio-runtime issue,
              not a contract bug. The write path is unaffected: transactions finalize, the AI Jury runs, and verdicts land on-chain.
              You can read those verdicts directly on GenLayer Explorer (linked from every verdict page).
            </span>
            <span className="text-xs text-slate-400">
              The Registry and VerdictDetail pages surface a "view unavailable" banner with a retry button and a direct
              Inspect on Explorer link. The app never fabricates a verdict — it always defers to on-chain state.
            </span>
          </div>
        </div>
      </section>

      {/* ============= CTA ============= */}
      <section className="glass-panel p-8 sm:p-10 flex flex-col items-center gap-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/40 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-brand-400" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white">See it live</h3>
        <p className="text-sm text-slate-400 max-w-lg">
          The full source is on GitHub. Every method the app calls is a public method on the on-chain contract.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/request"
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm flex items-center gap-2"
          >
            Start a case <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/phu1271997/stillhere-protocol"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center gap-2"
          >
            GitHub <ExternalLink className="w-4 h-4 text-brand-400" />
          </a>
          <a
            href={explorerAddressUrl(CORE_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center gap-2"
          >
            Core on Explorer <ExternalLink className="w-4 h-4 text-brand-400" />
          </a>
        </div>
      </section>
    </div>
  );
};

// ============= sub-components =============

const SectionTitle: React.FC<{ eyebrow: string; title: string; subtitle?: string }> = ({ eyebrow, title, subtitle }) => (
  <div className="flex flex-col items-center text-center gap-3 max-w-3xl mx-auto">
    <span className="text-xs uppercase tracking-wider font-semibold text-brand-400">{eyebrow}</span>
    <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{title}</h2>
    {subtitle && <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{subtitle}</p>}
  </div>
);

const AddressCard: React.FC<{ label: string; addr: string }> = ({ label, addr }) => (
  <div className="glass-card p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <a
        href={explorerAddressUrl(addr)}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
      >
        Explorer <ExternalLink className="w-3 h-3" />
      </a>
    </div>
    <span className="font-mono text-xs text-slate-200 break-all">{addr}</span>
  </div>
);

const Pillar: React.FC<{
  icon: React.ReactNode;
  color: 'brand' | 'emerald' | 'amber' | 'teal';
  title: string;
  body: string;
}> = ({ icon, color, title, body }) => {
  const map = {
    brand: 'bg-brand-500/10 border-brand-500/30 text-brand-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    teal: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
  } as const;
  return (
    <div className="glass-panel p-6 flex flex-col gap-3">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${map[color]}`}>{icon}</div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
};

const JurySteps: React.FC<{ n: number; icon: React.ReactNode; title: string; body: React.ReactNode }> = ({
  n, icon, title, body,
}) => (
  <li className="glass-card p-5 flex gap-4">
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <div className="w-9 h-9 rounded-full bg-brand-600/20 border border-brand-500/40 flex items-center justify-center text-sm font-bold text-brand-300">
        {n}
      </div>
      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-brand-400">
        {icon}
      </div>
    </div>
    <div className="flex flex-col gap-2">
      <h4 className="text-base font-bold text-white">{title}</h4>
      <div className="text-sm text-slate-400 leading-relaxed">{body}</div>
    </div>
  </li>
);

const FlagRow: React.FC<{ category: string; body: string }> = ({ category, body }) => (
  <div className="glass-card p-4 flex flex-col gap-1.5">
    <span className="self-start px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold">
      {category}
    </span>
    <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
  </div>
);

const FlowCard: React.FC<{ icon: React.ReactNode; title: string; steps: string[] }> = ({ icon, title, steps }) => (
  <div className="glass-panel p-5 flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
        {icon}
      </div>
      <h4 className="text-base font-bold text-white">{title}</h4>
    </div>
    <ol className="flex flex-col gap-2">
      {steps.map((s, i) => (
        <li key={i} className="text-xs text-slate-300 leading-relaxed flex gap-2">
          <span className="font-mono text-brand-400 flex-shrink-0">{i + 1}.</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  </div>
);

const FeeCard: React.FC<{ label: string; value: string; body: string }> = ({ label, value, body }) => (
  <div className="glass-panel p-5 flex flex-col gap-2">
    <span className="text-xs font-mono text-brand-400 uppercase tracking-wider">{label}</span>
    <span className="text-2xl font-bold text-white">{value}</span>
    <span className="text-xs text-slate-400 leading-relaxed">{body}</span>
  </div>
);

const EthicsRow: React.FC<{ tag: string; title: string; body: string }> = ({ tag, title, body }) => (
  <div className="glass-card p-4 flex gap-4 items-start">
    <span className="px-2 py-1 rounded-md bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono text-xs font-bold flex-shrink-0">
      {tag}
    </span>
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-semibold text-white">{title}</span>
      <span className="text-xs text-slate-400 leading-relaxed">{body}</span>
    </div>
  </div>
);

const WalletCard: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="glass-panel p-5 flex gap-4">
    <div className="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 flex-shrink-0">
      {icon}
    </div>
    <div className="flex flex-col gap-1.5">
      <h4 className="text-base font-bold text-white">{title}</h4>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  </div>
);
