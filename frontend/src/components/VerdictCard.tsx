import React from 'react';
import { ShieldCheck, AlertTriangle, XOctagon, HelpCircle } from 'lucide-react';
import { RedFlagBadge } from './RedFlagBadge';

interface RedFlagData {
  category: string;
  severity: string;
  evidence: string;
}

interface VerdictCardProps {
  label: string;
  confidence: number;
  reason: string;
  redFlags: RedFlagData[];
  finalizedAt?: number;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  label,
  confidence,
  reason,
  redFlags,
  finalizedAt,
}) => {
  const getBadgeConfig = () => {
    switch (label) {
      case 'LIKELY_REAL':
        return {
          bg: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
          icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
          title: 'Likely Authentic Profile',
        };
      case 'SUSPICIOUS':
        return {
          bg: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          title: 'Suspicious Indicators Found',
        };
      case 'LIKELY_SCAM_RING':
        return {
          bg: 'bg-rose-950/90 border-rose-600/70 text-rose-300 shadow-rose-950/50 shadow-2xl',
          icon: <XOctagon className="w-6 h-6 text-rose-400" />,
          title: 'Likely Scam Ring Pattern',
        };
      default:
        return {
          bg: 'bg-slate-900/80 border-slate-700 text-slate-300',
          icon: <HelpCircle className="w-6 h-6 text-slate-400" />,
          title: 'Inconclusive Assessment',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div className={`glass-panel p-6 border rounded-2xl flex flex-col gap-6 ${config.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {config.icon}
          <div>
            <h3 className="text-xl font-bold text-white">{config.title}</h3>
            <span className="font-mono text-xs opacity-80 uppercase tracking-wide">{label}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold font-mono">{confidence}%</span>
          <span className="text-xs text-slate-400">Jury Confidence</span>
        </div>
      </div>

      <div className="w-full bg-slate-950/60 rounded-full h-2 overflow-hidden border border-white/10">
        <div
          className="h-full bg-current transition-all duration-500 rounded-full"
          style={{ width: `${confidence}%` }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">AI Rationale</h4>
        <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-white/5 font-sans">
          {reason || 'No rationale provided by consensus.'}
        </p>
      </div>

      {redFlags && redFlags.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            Detected Flags ({redFlags.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {redFlags.map((flag, idx) => (
              <RedFlagBadge key={idx} category={flag.category} severity={flag.severity} evidence={flag.evidence} />
            ))}
          </div>
        </div>
      )}

      {finalizedAt && finalizedAt > 0 && (
        <div className="text-[11px] text-slate-400 font-mono text-right pt-2 border-t border-white/10">
          Finalized on-chain: {new Date(finalizedAt * 1000).toLocaleString()}
        </div>
      )}
    </div>
  );
};
