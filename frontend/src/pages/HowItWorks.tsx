import React from 'react';
import { Cpu, ShieldCheck, Scale, Lock } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-8 flex flex-col gap-8">
      <div className="text-center flex flex-col items-center gap-3">
        <h2 className="text-3xl font-extrabold text-white">How StillHere Works</h2>
        <p className="text-slate-400 max-w-xl text-sm">
          Decentralized Trust & Safety Architecture built on GenLayer Optimistic Democracy
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">1. Direct On-Chain Web Access</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            GenLayer Intelligent Contracts fetch public social URLs and reverse image queries directly inside non-deterministic execution blocks (`gl.nondet.web.render`), removing reliance on centralized or biased oracles.
          </p>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">2. Independent AI Jury Consensus</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Validators execute independent LLMs and reach consensus on semantic verdict meanings (`LIKELY_REAL`, `SUSPICIOUS`, `LIKELY_SCAM_RING`) rather than exact JSON strings.
          </p>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">3. Appellate Dispute Mechanism</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            If an assessment is disputed, Subjects or representatives can supply official counter-evidence to trigger a Round 2 appellate re-adjudication.
          </p>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">4. Privacy Protection (E1–E8)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Plaintext chat logs and PII are never stored in contract state. Only canonical `keccak256` hashes are recorded in the registry to prevent harassment or leaks.
          </p>
        </div>
      </div>
    </div>
  );
};
