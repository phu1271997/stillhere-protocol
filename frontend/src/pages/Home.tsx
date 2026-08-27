import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  HeartHandshake,
  Eye,
  Lock,
  ArrowRight,
  Database,
  AlertTriangle,
  Scale,
  Globe,
  Users,
  Cpu,
  FileCheck,
  Wallet,
  Search,
  Send,
  ExternalLink,
  Check,
  Bot,
  ChevronRight,
} from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col gap-24 py-8">
      {/* ================= HERO ================= */}
      <section className="flex flex-col items-center text-center gap-6 max-w-4xl mx-auto pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" /> Powered by GenLayer Consensus
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Protect Loved Ones from <br />
          <span className="bg-gradient-to-r from-brand-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Romance Scams On-Chain
          </span>
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
          StillHere lets families submit a suspect profile URL and chat pattern to a decentralized AI Jury on GenLayer.
          Independent validator LLMs read the profile live, weigh the evidence, and reach consensus on an advisory
          verdict — no single company issues the judgment, no plaintext is stored on-chain.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          <Link
            to="/request"
            className="px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-base shadow-xl shadow-brand-600/25 flex items-center gap-2 transition-all active:scale-95"
          >
            <span>Request AI Verification</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/how-it-works"
            className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-base flex items-center gap-2 transition-all"
          >
            <Cpu className="w-4 h-4 text-brand-400" />
            <span>How the Protocol Works</span>
          </Link>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 w-full max-w-2xl">
          <Stat value="$1.14B" label="lost to romance scams in 2023 (FTC)" />
          <Stat value="55+" label="most-affected age band, hardest hit financially" />
          <Stat value="4" label="verdict labels, thresholded and validator-reviewed" />
        </div>
      </section>

      {/* ================= PROBLEM ================= */}
      <section className="max-w-5xl mx-auto w-full flex flex-col gap-8">
        <SectionHeader
          eyebrow="The problem"
          title="Romance scams are catastrophic, quiet, and undereported"
          subtitle="Existing tooling is built for institutions, not families. Victims are isolated, shame-bound, and unlikely to reach out until money has already left."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProblemCard
            icon={<AlertTriangle className="w-6 h-6" />}
            title="Centralized AI won't touch it"
            body="Any single provider issuing 'this is a scam' verdicts on real people faces direct defamation liability. So they don't — you get 'we can't help with that'."
          />
          <ProblemCard
            icon={<Users className="w-6 h-6" />}
            title="Platforms silently ban"
            body="Dating apps shadow-ban suspected scam profiles without public warnings. The scammer just makes a new account. Nobody in the network is warned."
          />
          <ProblemCard
            icon={<Scale className="w-6 h-6" />}
            title="Law enforcement acts too late"
            body="FBI IC3 and similar bodies open cases after money is gone. There is no low-friction, pre-loss second opinion for a worried family member."
          />
        </div>
      </section>

      {/* ================= SOLUTION ================= */}
      <section className="max-w-5xl mx-auto w-full flex flex-col gap-8">
        <SectionHeader
          eyebrow="How StillHere fixes it"
          title="Decentralized AI Jury — not one company, many independent validators"
          subtitle="Every request runs inside a GenLayer Intelligent Contract. The leader validator fetches the profile, prompts an LLM; N other validators re-execute and vote. Consensus binds on the verdict, confidence range, and red-flag categories — not on free-text wording. That is the property a centralized AI cannot offer."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SolutionRow
            n="01"
            icon={<Globe className="w-5 h-5" />}
            title="On-chain web reads, no oracle"
            body="Validators call gl.nondet.web.render(url) inside the same transaction to fetch the public profile page. No off-chain proxy, no oracle to trust or attack."
          />
          <SolutionRow
            n="02"
            icon={<Bot className="w-5 h-5" />}
            title="Independent LLM inference per validator"
            body="Each validator runs its own LLM against the same evidence. The prompt embeds a per-case canary; a validator whose output is missing the canary is treated as tampered."
          />
          <SolutionRow
            n="03"
            icon={<Check className="w-5 h-5" />}
            title="Consensus on meaning, not on wording"
            body="A custom validator_fn accepts differing reason phrases but requires the verdict label to match, confidence to fall within ±10, and the CRITICAL and WARNING red-flag category sets to match."
          />
          <SolutionRow
            n="04"
            icon={<Lock className="w-5 h-5" />}
            title="Privacy by construction (E1–E8)"
            body="Chat samples and PII are never persisted on-chain — only keccak256 hashes. Profile lookups in the registry go by canonical hash, not by name."
          />
        </div>
      </section>

      {/* ================= HOW-TO SUBMIT ================= */}
      <section className="max-w-5xl mx-auto w-full flex flex-col gap-8">
        <SectionHeader
          eyebrow="Submit a case"
          title="Five steps, about ten minutes"
          subtitle="You'll need MetaMask and roughly 0.005 GEN on studionet. Fund from the Studio Accounts panel — the public testnet faucet does not fund studionet."
        />

        <ol className="flex flex-col gap-4">
          <SubmitStep
            n={1}
            icon={<Wallet className="w-5 h-5" />}
            title="Connect a MetaMask wallet"
            body="Click Connect in the header. MetaMask prompts to add or switch to GenLayer Studio Network (chain id 61999 / 0xF1EF). Approve — the app never sees your private key."
          />
          <SubmitStep
            n={2}
            icon={<Send className="w-5 h-5" />}
            title="Fill in the case form"
            body="One public profile URL (min), the claimed identity fields, and an optional short paraphrased chat sample. Chat text is hashed client-side; the hash is what goes on-chain."
            link={{ to: '/request', label: 'Open the request form' }}
          />
          <SubmitStep
            n={3}
            icon={<Cpu className="w-5 h-5" />}
            title="Sign, then wait for the AI Jury"
            body="Base fee is 0.001 GEN. Signing triggers request_verification, which invokes _run_ai_jury inside the same tx. Typical wall clock: 30–120 s. The pending page polls studionet every 4 s and hands off automatically."
          />
          <SubmitStep
            n={4}
            icon={<FileCheck className="w-5 h-5" />}
            title="Read the verdict"
            body="Once finalized, you get a label (LIKELY_REAL / INCONCLUSIVE / SUSPICIOUS / LIKELY_SCAM_RING), a confidence score, a reason, and a list of red flags with severities. Every field is written on-chain and readable from the linked transaction on GenLayer Explorer."
          />
          <SubmitStep
            n={5}
            icon={<Scale className="w-5 h-5" />}
            title="(Optional) File a dispute or contribute evidence"
            body="If you are the subject, file a Round 2 appeal with counter-evidence URLs for 0.002 GEN — the jury re-runs and writes verdict_v2. If you have corroborating URLs for someone else's case, contribute them; the jury weighs them on re-adjudication."
          />
        </ol>

        <div className="glass-card p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-amber-300">Known limitation — Studio Preview only</span>
            <span className="text-slate-400">
              The Studio eth_call view route is currently returning execution errors for these contracts, so the verdict
              detail page shows a "view unavailable" banner with a direct link to the transaction on GenLayer Explorer,
              where the on-chain verdict renders. The app never fabricates a verdict — it always defers to the tx.
            </span>
          </div>
        </div>
      </section>

      {/* ================= VERDICT LABELS ================= */}
      <section className="max-w-5xl mx-auto w-full flex flex-col gap-8">
        <SectionHeader
          eyebrow="Verdict vocabulary"
          title="Four labels, advisory only, thresholded"
          subtitle="The strongest label (LIKELY_SCAM_RING) is auto-downgraded when the evidence doesn't meet strict thresholds — see rule E4 below."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <VerdictLabel color="emerald" label="LIKELY_REAL" body="Consistent digital footprint, coherent identity, no critical flags. Advisory only, not proof of authenticity." />
          <VerdictLabel color="slate" label="INCONCLUSIVE" body="Evidence is thin, contradictory, or a single web fetch failed. Preferred default when the jury is uncertain." />
          <VerdictLabel color="amber" label="SUSPICIOUS" body="Multiple red flags but not enough for the strongest label. What LIKELY_SCAM_RING downgrades to under E4." />
          <VerdictLabel color="rose" label="LIKELY_SCAM_RING" body="Only issued with confidence ≥ 85 AND ≥ 2 CRITICAL red flags from converging independent sources." />
        </div>

        <div className="glass-card p-5 flex flex-col gap-2 text-xs">
          <span className="text-slate-400 uppercase tracking-wider font-semibold">Rule E4 — automatic downgrade</span>
          <span className="text-slate-300">
            If the AI outputs <span className="font-mono text-rose-300">LIKELY_SCAM_RING</span> but
            <span className="font-mono text-slate-100"> confidence &lt; 85 </span> OR
            <span className="font-mono text-slate-100"> critical flags &lt; 2</span>, the contract writes
            <span className="font-mono text-amber-300"> SUSPICIOUS </span> to storage instead. This is a hard rule in
            <span className="font-mono text-brand-300"> _normalize_verdict</span>, not a validator opinion.
          </span>
        </div>
      </section>

      {/* ================= WHO IT'S FOR ================= */}
      <section className="max-w-5xl mx-auto w-full flex flex-col gap-8">
        <SectionHeader eyebrow="Who this is built for" title="Concrete users, not 'everyone'" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AudienceCard
            title="Adult children helping isolated parents"
            body="Your parent mentioned an overseas partner they've never met. You want a neutral second opinion before starting a difficult conversation."
          />
          <AudienceCard
            title="Romance-scam recovery groups"
            body="Peer-support networks need a way to quickly triage new members' stories and identify pattern-matches to known scam scripts."
          />
          <AudienceCard
            title="Dating-platform moderators"
            body="A reason for takedown that isn't 'we said so' — a decentralized second opinion your users can independently verify on-chain."
          />
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        <SectionHeader eyebrow="Frequently asked" title="Short answers, honest ones" />

        <div className="flex flex-col gap-3">
          <FAQ
            q="Is the verdict a legal determination?"
            a="No. Every verdict is advisory. It is designed to prompt a conversation, not to authorize action against a real person. The app carries an advisory banner on every screen for this reason."
          />
          <FAQ
            q="Do you store the chat sample I paste in?"
            a="No. The chat sample is hashed client-side with keccak256 before it leaves your browser. Only the hash is written to contract state. The plaintext is fed into the leader validator's prompt in-memory and is not persisted."
          />
          <FAQ
            q="What if the AI is wrong?"
            a="Anyone whose profile was flagged can pay dispute_fee (0.002 GEN) to file_dispute and trigger a Round 2 AI Jury with counter-evidence URLs. verdict_v2 supersedes verdict_v1 on the read path. There is exactly one appeal round per case."
          />
          <FAQ
            q="Why GenLayer instead of a normal cloud AI?"
            a="A cloud AI provider that issues public 'this is a scammer' verdicts on real people is one lawsuit away from shutdown — that's why they refuse. GenLayer's validator set collectively produces the verdict, no single entity holds the liability, and the decision itself is a public on-chain record anyone can audit."
          />
          <FAQ
            q="What can go wrong technically?"
            a="Studio's view execution route is currently intermittent for these contracts, so the app's verdict detail view falls back to an Explorer link. Writes finalize correctly; only the read path from inside the app is affected. Explorer shows the same verdict data."
          />
          <FAQ
            q="Is this on mainnet?"
            a="No. This is deployed to GenLayer Studionet (chain id 61999) and listed as Preview status. Mainnet is on the GenLayer roadmap for Q4 2026."
          />
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="max-w-4xl mx-auto w-full">
        <div className="glass-panel p-8 sm:p-12 flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/40 flex items-center justify-center">
            <HeartHandshake className="w-7 h-7 text-brand-400" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white">
            Ready to protect someone you care about?
          </h3>
          <p className="text-sm text-slate-400 max-w-lg">
            Open a case in about ten minutes. Connect MetaMask, submit one public URL, wait for the AI Jury to finalize
            the on-chain verdict.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/request"
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm flex items-center gap-2"
            >
              Start a case <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/registry"
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-brand-400" /> Search a profile hash
            </Link>
            <a
              href="https://github.com/phu1271997/stillhere-protocol"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-sm flex items-center gap-2"
            >
              Read the code <ExternalLink className="w-4 h-4 text-brand-400" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

// ================================
// Sub-components
// ================================

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-2xl sm:text-3xl font-extrabold text-white">{value}</span>
    <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 leading-tight text-center">{label}</span>
  </div>
);

const SectionHeader: React.FC<{ eyebrow: string; title: string; subtitle?: string }> = ({ eyebrow, title, subtitle }) => (
  <div className="flex flex-col items-center text-center gap-3 max-w-3xl mx-auto">
    <span className="text-xs uppercase tracking-wider font-semibold text-brand-400">{eyebrow}</span>
    <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">{title}</h2>
    {subtitle && <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{subtitle}</p>}
  </div>
);

const ProblemCard: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="glass-card p-6 flex flex-col gap-3">
    <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-white">{title}</h3>
    <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
  </div>
);

const SolutionRow: React.FC<{ n: string; icon: React.ReactNode; title: string; body: string }> = ({ n, icon, title, body }) => (
  <div className="glass-card p-6 flex gap-4">
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <span className="text-xs font-mono font-bold text-brand-400">{n}</span>
      <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
        {icon}
      </div>
    </div>
    <div className="flex flex-col gap-1.5">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  </div>
);

const SubmitStep: React.FC<{
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
  link?: { to: string; label: string };
}> = ({ n, icon, title, body, link }) => (
  <li className="glass-card p-5 flex gap-4">
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <div className="w-10 h-10 rounded-full bg-brand-600/20 border border-brand-500/40 flex items-center justify-center font-bold text-brand-300">
        {n}
      </div>
      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-brand-400">
        {icon}
      </div>
    </div>
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
      {link && (
        <Link
          to={link.to}
          className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 self-start"
        >
          {link.label} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  </li>
);

const VerdictLabel: React.FC<{ color: 'emerald' | 'slate' | 'amber' | 'rose'; label: string; body: string }> = ({
  color,
  label,
  body,
}) => {
  const map = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    slate: 'bg-slate-500/10 border-slate-500/30 text-slate-300',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    rose: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
  } as const;
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <span className={`self-start px-2.5 py-1 rounded-md border font-mono text-xs font-bold ${map[color]}`}>
        {label}
      </span>
      <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
};

const AudienceCard: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="glass-card p-6 flex flex-col gap-2">
    <h3 className="text-base font-bold text-white">{title}</h3>
    <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
  </div>
);

const FAQ: React.FC<{ q: string; a: string }> = ({ q, a }) => (
  <details className="glass-card p-5 group">
    <summary className="cursor-pointer flex items-start justify-between gap-3 list-none">
      <span className="text-sm sm:text-base font-semibold text-white">{q}</span>
      <ChevronRight className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5 transition-transform group-open:rotate-90" />
    </summary>
    <p className="text-sm text-slate-400 leading-relaxed mt-3 pt-3 border-t border-slate-800/60">{a}</p>
  </details>
);
