import React, { useState, useEffect } from 'react';
import { Loader2, Cpu, ShieldCheck } from 'lucide-react';

export const LoadingConsensus: React.FC = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-panel p-8 max-w-lg mx-auto text-center flex flex-col items-center gap-4 my-12">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center animate-pulse">
          <Cpu className="w-8 h-8 text-brand-400" />
        </div>
        <Loader2 className="w-20 h-20 text-brand-500 animate-spin absolute -top-2 -left-2 opacity-80" />
      </div>

      <h3 className="text-xl font-bold text-slate-100 mt-2">AI Jury Reaching Consensus...</h3>
      <p className="text-sm text-slate-400 max-w-md leading-relaxed">
        GenLayer AI validators are fetching public profile data, performing reverse image checks, and running independent LLM evaluations.
      </p>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
        <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
        <span>Non-Deterministic Execution: {seconds}s elapsed (Est: ~60–120s)</span>
      </div>
    </div>
  );
};
