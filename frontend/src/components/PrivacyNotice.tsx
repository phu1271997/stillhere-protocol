import React from 'react';
import { Lock, EyeOff } from 'lucide-react';

export const PrivacyNotice: React.FC = () => {
  return (
    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 flex flex-col gap-2 mb-6">
      <div className="flex items-center gap-2 font-semibold text-slate-200">
        <Lock className="w-4 h-4 text-brand-500" />
        <span>Privacy & Safety Safeguards (E1 & E2)</span>
      </div>
      <p className="text-slate-400 leading-relaxed">
        Do not paste private chat logs or full real-name personal identifying information (PII).
        Only hash identifiers (`keccak256`) are persisted on-chain. Paraphrase chat text to remove sensitive personal details before submission.
      </p>
      <div className="flex items-center gap-4 text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
        <span className="flex items-center gap-1"><EyeOff className="w-3.5 h-3.5 text-brand-400" /> No Plaintext Chat Saved</span>
        <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-brand-400" /> Hashed Profile Record</span>
      </div>
    </div>
  );
};
