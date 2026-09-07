import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, RefreshCcw, ExternalLink, AlertCircle, TrendingUp, ShieldOff, ShieldCheck } from 'lucide-react';
import { readView, CORE_ADDRESS, explorerAddressUrl } from '../lib/client';

interface RequesterStats {
  total_cases: number;
  scam_hits: number;
  real_hits: number;
  inconclusive_hits: number;
  failed_cases: number;
  disputes_filed: number;
  last_active: number;
}

const emptyRs = (): RequesterStats => ({
  total_cases: 0,
  scam_hits: 0,
  real_hits: 0,
  inconclusive_hits: 0,
  failed_cases: 0,
  disputes_filed: 0,
  last_active: 0,
});

const TIER_STYLES: Record<string, { chip: string; badge: string; icon: React.ReactNode; blurb: string }> = {
  GUARDIAN: {
    chip: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
    badge: 'text-emerald-400',
    icon: <ShieldCheck className="w-5 h-5" />,
    blurb: '10+ cases and ≥30% of them flagged as SUSPICIOUS or LIKELY_SCAM_RING. This wallet has a track record of surfacing real scammers.',
  },
  TRUSTED: {
    chip: 'bg-teal-500/10 border-teal-500/40 text-teal-300',
    badge: 'text-teal-400',
    icon: <ShieldCheck className="w-5 h-5" />,
    blurb: '3+ cases with ≥15% flagged. Emerging track record, watch this wallet.',
  },
  NEWCOMER: {
    chip: 'bg-slate-500/10 border-slate-500/40 text-slate-300',
    badge: 'text-slate-400',
    icon: <TrendingUp className="w-5 h-5" />,
    blurb: 'Wallet has submitted at least one case but not enough history yet to place higher.',
  },
  SUSPECT: {
    chip: 'bg-rose-500/10 border-rose-500/40 text-rose-300',
    badge: 'text-rose-400',
    icon: <ShieldOff className="w-5 h-5" />,
    blurb: 'Every submitted case has ended in FAILED state — jury never converged. Possible spam or malformed evidence.',
  },
  UNRANKED: {
    chip: 'bg-slate-800 border-slate-800 text-slate-400',
    badge: 'text-slate-500',
    icon: <Award className="w-5 h-5" />,
    blurb: 'No submissions from this address yet.',
  },
};

export const Trust: React.FC = () => {
  const { addr = '' } = useParams();
  const [tier, setTier] = useState<string>('UNRANKED');
  const [stats, setStats] = useState<RequesterStats>(emptyRs);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  const cleaned = addr.trim().toLowerCase();
  const looksLikeAddr = /^0x[a-f0-9]{40}$/.test(cleaned);

  const load = async () => {
    if (!looksLikeAddr) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setWarning(null);
    try {
      const [tierRes, statsRes] = await Promise.all([
        readView<string>(CORE_ADDRESS, 'get_trust_tier', [cleaned]),
        readView<RequesterStats>(CORE_ADDRESS, 'get_requester_stats', [cleaned]),
      ]);
      if (tierRes.ok && typeof tierRes.data === 'string') {
        setTier(tierRes.data);
      } else if (tierRes.error) {
        setWarning(tierRes.error);
      }
      if (statsRes.ok && statsRes.data && typeof statsRes.data === 'object') {
        setStats({ ...emptyRs(), ...statsRes.data });
      }
    } catch (err: any) {
      setWarning(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaned]);

  const style = TIER_STYLES[tier] || TIER_STYLES.UNRANKED;
  const accuracyPct = stats.total_cases === 0 ? 0 : Math.round((stats.scam_hits / stats.total_cases) * 100);
  const lastActive = stats.last_active ? new Date(stats.last_active * 1000).toLocaleString() : '—';

  if (!looksLikeAddr) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="glass-panel p-6 flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">Invalid wallet address</h2>
          <p className="text-sm text-slate-400">The address <code className="font-mono text-brand-300">{addr}</code> is not a valid 0x-prefixed 40-hex string.</p>
          <Link to="/" className="text-brand-400 text-sm mt-2">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 flex flex-col gap-6">
      <div className="glass-panel p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-500" /> Requester Trust Profile
            </h2>
            <p className="font-mono text-xs text-slate-400 mt-1 break-all">{cleaned}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={explorerAddressUrl(cleaned)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Explorer
            </a>
            <button
              onClick={load}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${style.chip} flex items-start gap-3`}>
          <div className={style.badge}>{style.icon}</div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold uppercase tracking-widest">{tier}</span>
            <p className="text-xs text-slate-300 leading-relaxed">{style.blurb}</p>
          </div>
        </div>

        {warning && (
          <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Studionet view intermittent ({warning}). Showing best-effort data.</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <MetricTile label="Total cases" value={stats.total_cases} />
          <MetricTile label="Scam hits" value={stats.scam_hits} accent="text-rose-300" />
          <MetricTile label="Real hits" value={stats.real_hits} accent="text-emerald-300" />
          <MetricTile label="Failed" value={stats.failed_cases} accent="text-slate-400" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricTile label="Disputes filed" value={stats.disputes_filed} />
          <MetricTile label="Scam-hit rate" value={`${accuracyPct}%`} />
          <MetricTile label="Last active" value={lastActive} smallText />
        </div>
      </div>

      <div className="glass-card p-4 text-xs text-slate-400">
        <p className="leading-relaxed">
          Trust tiers are derived on-chain from <code className="font-mono text-slate-300">RequesterStats</code>. Tier
          bands: <b className="text-emerald-300">GUARDIAN</b> requires ≥10 cases and ≥30% scam-hit rate;{' '}
          <b className="text-teal-300">TRUSTED</b> requires ≥3 cases and ≥15% scam-hit rate;{' '}
          <b className="text-slate-300">NEWCOMER</b> is any wallet with at least one submission;{' '}
          <b className="text-rose-300">SUSPECT</b> is a wallet whose every case failed the jury. These are advisory —
          use them as a signal, not a certification.
        </p>
      </div>
    </div>
  );
};

const MetricTile: React.FC<{ label: string; value: number | string; accent?: string; smallText?: boolean }> = ({ label, value, accent, smallText }) => (
  <div className="glass-card p-3 flex flex-col gap-0.5">
    <span className={`${smallText ? 'text-xs' : 'text-xl'} font-bold font-mono ${accent || 'text-white'}`}>{value}</span>
    <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
  </div>
);
