import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCcw, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { readView, CORE_ADDRESS, REGISTRY_ADDRESS, explorerAddressUrl } from '../lib/client';

const VERDICT_LABELS = ['LIKELY_REAL', 'INCONCLUSIVE', 'SUSPICIOUS', 'LIKELY_SCAM_RING'] as const;
type VerdictLabel = typeof VERDICT_LABELS[number];

const LABEL_COLORS: Record<VerdictLabel, { bar: string; text: string; ring: string }> = {
  LIKELY_REAL: { bar: 'bg-emerald-500', text: 'text-emerald-300', ring: 'ring-emerald-500/40' },
  INCONCLUSIVE: { bar: 'bg-slate-400', text: 'text-slate-300', ring: 'ring-slate-500/40' },
  SUSPICIOUS: { bar: 'bg-amber-500', text: 'text-amber-300', ring: 'ring-amber-500/40' },
  LIKELY_SCAM_RING: { bar: 'bg-rose-500', text: 'text-rose-300', ring: 'ring-rose-500/40' },
};

interface Stats {
  total_cases: number;
  total_profiles: number;
  counts: Record<VerdictLabel, number>;
  paused: boolean;
  loadedFromChain: boolean;
  errors: string[];
}

const emptyStats = (): Stats => ({
  total_cases: 0,
  total_profiles: 0,
  counts: { LIKELY_REAL: 0, INCONCLUSIVE: 0, SUSPICIOUS: 0, LIKELY_SCAM_RING: 0 },
  paused: false,
  loadedFromChain: false,
  errors: [],
});

async function readNumber(addr: `0x${string}`, fn: string, args: any[]): Promise<{ ok: boolean; value?: number; err?: string }> {
  const r = await readView<number | string>(addr, fn, args);
  if (!r.ok) return { ok: false, err: r.error };
  const v = typeof r.data === 'number' ? r.data : Number(r.data as any);
  if (Number.isFinite(v)) return { ok: true, value: v };
  return { ok: false, err: `unparseable response: ${String(r.data)}` };
}

export const Stats: React.FC = () => {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const s = emptyStats();
    try {
      const [total, totalProfiles, paused, ...perLabel] = await Promise.all([
        readNumber(CORE_ADDRESS, 'get_total_cases', []),
        readNumber(REGISTRY_ADDRESS, 'get_total_profiles', []),
        readView<boolean>(CORE_ADDRESS, 'get_paused', []),
        ...VERDICT_LABELS.map(l => readNumber(CORE_ADDRESS, 'get_verdict_count', [l])),
      ]);
      if (total.ok && total.value !== undefined) {
        s.total_cases = total.value;
        s.loadedFromChain = true;
      } else if (total.err) {
        s.errors.push(`total cases: ${total.err}`);
      }
      if (totalProfiles.ok && totalProfiles.value !== undefined) {
        s.total_profiles = totalProfiles.value;
      } else if (totalProfiles.err) {
        s.errors.push(`total profiles: ${totalProfiles.err}`);
      }
      if (paused.ok) {
        s.paused = Boolean(paused.data);
      }
      VERDICT_LABELS.forEach((lbl, i) => {
        const r = perLabel[i];
        if (r.ok && r.value !== undefined) {
          s.counts[lbl] = r.value;
        }
      });
    } catch (err: any) {
      s.errors.push(err?.message || String(err));
    }
    setStats(s);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const total = VERDICT_LABELS.reduce((sum, l) => sum + (stats.counts[l] || 0), 0);
  const scamShare = total === 0 ? 0 : Math.round(((stats.counts.SUSPICIOUS + stats.counts.LIKELY_SCAM_RING) / total) * 100);

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-8">
      <div className="glass-panel p-8 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-brand-500" />
              Protocol Analytics
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Aggregate on-chain read: total cases submitted, profile registry size, verdict distribution across the
              GenLayer AI Jury. Reads through the studionet view route — if it is intermittent, click Retry.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Loading' : 'Refresh'}
          </button>
        </div>

        {stats.paused && (
          <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-700/40 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>The protocol is currently paused by admin. New requests, disputes, and contributions are rejected. Existing withdrawals still work.</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Total cases" value={stats.total_cases} />
          <StatTile label="Unique profiles" value={stats.total_profiles} />
          <StatTile label="% flagged" value={`${scamShare}%`} />
          <StatTile label="Verdicts recorded" value={total} />
        </div>
      </div>

      <div className="glass-panel p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-400" /> Verdict distribution
          </h3>
          <span className="text-xs text-slate-500">on-chain histogram</span>
        </div>

        {total === 0 && !loading && stats.errors.length === 0 && (
          <div className="text-sm text-slate-400">
            No verdicts recorded yet. Submit a case from{' '}
            <a href="/request" className="text-brand-400 underline">Request Verify</a> and this histogram will populate as the AI Jury finalizes.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {VERDICT_LABELS.map(lbl => {
            const c = stats.counts[lbl] || 0;
            const share = total === 0 ? 0 : Math.round((c / total) * 100);
            const style = LABEL_COLORS[lbl];
            return (
              <div key={lbl} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-mono ${style.text}`}>{lbl}</span>
                  <span className="font-mono text-slate-400">{c} · {share}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden ring-1 ring-slate-800">
                  <div className={`h-full ${style.bar}`} style={{ width: `${Math.max(3, share)}%`, minWidth: c > 0 ? '6px' : '0' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stats.errors.length > 0 && !loading && (
        <div className="glass-card p-4 flex flex-col gap-2 border border-amber-700/40" role="status">
          <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold">
            <AlertCircle className="w-4 h-4" /> Partial data — some view calls failed
          </div>
          <p className="text-xs text-slate-400">
            Studionet's eth_call route is intermittently offline for these contracts. Data displayed above reflects only
            the counters that returned. Inspect the contracts directly on the Explorer:
          </p>
          <div className="flex items-center gap-3 text-xs">
            <a href={explorerAddressUrl(CORE_ADDRESS)} target="_blank" rel="noreferrer" className="text-brand-400 inline-flex items-center gap-1">
              StillHereCore <ExternalLink className="w-3 h-3" />
            </a>
            <a href={explorerAddressUrl(REGISTRY_ADDRESS)} target="_blank" rel="noreferrer" className="text-brand-400 inline-flex items-center gap-1">
              ScammerRegistry <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <details className="text-xs text-slate-500 mt-1">
            <summary className="cursor-pointer">Raw errors</summary>
            <ul className="ml-4 mt-1 list-disc font-mono">
              {stats.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
};

const StatTile: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="glass-card p-4 flex flex-col gap-1">
    <span className="text-2xl font-bold text-white font-mono">{value}</span>
    <span className="text-xs text-slate-400 leading-tight">{label}</span>
  </div>
);
