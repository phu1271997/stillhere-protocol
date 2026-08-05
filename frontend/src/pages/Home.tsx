import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartHandshake, Eye, Lock, ArrowRight, Database } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col gap-16 py-8">
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
          StillHere empowers families to submit public social links & pattern evidence for objective AI Jury evaluation on GenLayer — delivering decentralized verdicts without central liability.
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
            to="/registry"
            className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-base flex items-center gap-2 transition-all"
          >
            <Database className="w-4 h-4 text-brand-400" />
            <span>Search Profile Registry</span>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
        <div className="glass-card p-6 flex flex-col gap-3">
          <HeartHandshake className="w-8 h-8 text-brand-400 mb-1" />
          <h3 className="text-lg font-bold text-white">Family Protection</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Over $1.14B lost annually to romance scams. Families get objective, evidence-backed verdicts to protect vulnerable members.
          </p>
        </div>

        <div className="glass-card p-6 flex flex-col gap-3">
          <Eye className="w-8 h-8 text-emerald-400 mb-1" />
          <h3 className="text-lg font-bold text-white">Multi-Source AI Jury</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Validators independently fetch live public profile pages, run reverse image lookups, and evaluate chat patterns directly on-chain.
          </p>
        </div>

        <div className="glass-card p-6 flex flex-col gap-3">
          <Lock className="w-8 h-8 text-teal-400 mb-1" />
          <h3 className="text-lg font-bold text-white">Privacy First (E1 & E2)</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Chat logs and PII are never persisted in plaintext. Only canonical `keccak256` hashes are recorded in contract state.
          </p>
        </div>
      </section>
    </div>
  );
};
