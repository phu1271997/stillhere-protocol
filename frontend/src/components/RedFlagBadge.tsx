import React from 'react';

interface RedFlagBadgeProps {
  category: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  evidence: string;
}

export const RedFlagBadge: React.FC<RedFlagBadgeProps> = ({ category, severity, evidence }) => {
  const getSeverityStyle = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-950/80 border-rose-600/60 text-rose-300';
      case 'WARNING':
        return 'bg-amber-950/80 border-amber-600/60 text-amber-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className={`p-3 rounded-lg border text-xs flex flex-col gap-1 ${getSeverityStyle()}`}>
      <div className="flex items-center justify-between font-mono font-semibold">
        <span>{category}</span>
        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-black/40 border border-current/20">
          {severity}
        </span>
      </div>
      <p className="text-slate-300 font-sans leading-relaxed">{evidence}</p>
    </div>
  );
};
