import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { VerdictCard } from '../components/VerdictCard';
import { VerdictSkeleton } from '../components/Skeleton';
import { Scale, ArrowLeft, ExternalLink, Info, AlertCircle, RefreshCcw } from 'lucide-react';
import {
  CORE_ADDRESS,
  readView,
  fetchTransaction,
  explorerTxUrl,
  explorerAddressUrl,
  StudionetTx,
} from '../lib/client';
import { loadCase, StoredCaseMeta } from '../lib/caseStore';

interface OnChainCase {
  state: string;
  submitted_at: number;
  fee_paid: number;
  bounty_pool: number;
  requester?: string;
  profile_hash?: string;
  chat_sample_hash?: string;
  claimed_identity_hash?: string;
  public_urls?: string[];
  image_urls?: string[];
  dispute_evidence_urls?: string[];
  verdict_v1?: any;
  verdict_v2?: any;
}

interface OnChainVerdict {
  label: string;
  confidence: number;
  reason: string;
  red_flags: Array<{ category: string; severity: string; evidence: string }>;
  finalized_at: number;
}

function normalizeVerdict(v: any): OnChainVerdict | null {
  if (!v || typeof v !== 'object') return null;
  return {
    label: String(v.label ?? 'INCONCLUSIVE'),
    confidence: Number(v.confidence ?? 0),
    reason: String(v.reason ?? ''),
    red_flags: Array.isArray(v.red_flags) ? v.red_flags : [],
    finalized_at: Number(v.finalized_at ?? 0),
  };
}

export const VerdictDetail: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const caseId = id || '';
  const txHash = searchParams.get('tx');

  const [caseData, setCaseData] = useState<OnChainCase | null>(null);
  const [verdict, setVerdict] = useState<OnChainVerdict | null>(null);
  const [tx, setTx] = useState<StudionetTx | null>(null);
  const [stored, setStored] = useState<StoredCaseMeta | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setStored(loadCase(caseId));
      setViewError(null);

      const [caseR, verdictR, txR] = await Promise.all([
        readView<OnChainCase>(CORE_ADDRESS, 'get_case', [caseId]),
        readView<OnChainVerdict>(CORE_ADDRESS, 'get_verdict', [caseId]),
        txHash ? fetchTransaction(txHash as `0x${string}`) : Promise.resolve(null),
      ]);
      if (cancelled) return;

      if (caseR.ok && caseR.data) setCaseData(caseR.data);
      if (verdictR.ok && verdictR.data) setVerdict(normalizeVerdict(verdictR.data));
      if (txR) setTx(txR);

      if (!caseR.ok && !verdictR.ok) {
        setViewError(caseR.error || verdictR.error || 'view read unavailable');
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [caseId, txHash, refetchToken]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 flex flex-col gap-6">
        <VerdictSkeleton />
      </div>
    );
  }

  const state = caseData?.state ?? (tx?.status === 'FINALIZED' ? 'PROCESSING' : 'PENDING');
  const publicUrls = caseData?.public_urls ?? stored?.publicUrls ?? [];
  const requester = caseData?.requester ?? tx?.from_address ?? stored?.requester;
  const submittedAt = caseData?.submitted_at ?? stored?.submittedAt ?? 0;

  return (
    <div className="max-w-3xl mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link to="/" className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <span className="font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
          Case ID: #{caseId}
        </span>
      </div>

      {viewError && !verdict && (
        <div className="glass-card p-4 flex items-start gap-3 border border-amber-700/40" role="status">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-2 text-xs">
            <span className="font-semibold text-amber-300">On-chain view read unavailable right now</span>
            <span className="text-slate-400">
              {viewError}. Studionet's <code className="text-brand-300">eth_call</code> view route is intermittently offline —
              the case + verdict are finalized on-chain (see the transaction link below). This page never renders a
              fabricated verdict; it will populate as soon as the view route recovers.
            </span>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setRefetchToken(t => t + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium"
              >
                <RefreshCcw className="w-3 h-3" /> Retry view read
              </button>
              {txHash && (
                <a
                  href={explorerTxUrl(txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300"
                >
                  Inspect tx on Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {verdict ? (
        <VerdictCard
          label={verdict.label}
          confidence={verdict.confidence}
          reason={verdict.reason}
          redFlags={verdict.red_flags}
          finalizedAt={verdict.finalized_at}
        />
      ) : (
        <div className="glass-panel p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold text-white">Verdict not yet materialized</h3>
          </div>
          <p className="text-sm text-slate-400">
            Case state: <span className="font-mono text-slate-200">{state}</span>. The AI Jury runs inside the
            <code className="mx-1 px-1.5 py-0.5 bg-slate-950 rounded text-brand-300 text-xs">request_verification</code>
            transaction; once it finalizes on studionet the verdict will render here automatically on next load.
          </p>
        </div>
      )}

      <div className="glass-panel p-6 flex flex-col gap-3 text-xs">
        <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">On-Chain Case Metadata</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MetaRow label="State" value={state} mono />
          <MetaRow label="Submitted At" value={submittedAt ? new Date(submittedAt * 1000).toLocaleString() : '—'} />
          <MetaRow label="Requester" value={requester || '—'} mono truncate />
          <MetaRow label="Profile hash" value={caseData?.profile_hash || stored?.profileHash || '—'} mono truncate />
          <MetaRow label="Fee paid (wei)" value={caseData?.fee_paid?.toString() || '—'} mono />
          <MetaRow label="Bounty pool (wei)" value={caseData?.bounty_pool?.toString() || stored?.bountyTopupWei || '—'} mono />
        </div>

        {publicUrls.length > 0 && (
          <div className="flex flex-col gap-1 pt-3 border-t border-slate-800">
            <span className="text-slate-400 uppercase tracking-wider">Public URLs</span>
            <ul className="flex flex-col gap-1">
              {publicUrls.map((u, i) => (
                <li key={i} className="font-mono text-slate-300 truncate">
                  <a href={u} target="_blank" rel="noreferrer" className="hover:text-brand-300">{u}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-1 pt-3 border-t border-slate-800">
          <span className="text-slate-400 uppercase tracking-wider">On-chain Links</span>
          <a
            href={explorerAddressUrl(CORE_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            Core contract <ExternalLink className="w-3 h-3" />
          </a>
          {txHash && (
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              Request tx <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      <div className="glass-panel p-6 flex flex-col gap-4">
        <div>
          <h4 className="font-bold text-white text-base">Take action on this case</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Anyone with corroborating evidence can contribute a URL for the jury to weigh. The subject can file a dispute
            to trigger a Round 2 AI Jury re-adjudication.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/contribute/${caseId}`}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm flex items-center gap-2 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Contribute Evidence</span>
          </Link>
          <Link
            to={`/dispute/${caseId}`}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm flex items-center gap-2 transition-all"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>File Dispute (Round 2)</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

const MetaRow: React.FC<{ label: string; value: string; mono?: boolean; truncate?: boolean }> = ({ label, value, mono, truncate }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-slate-400 uppercase tracking-wider">{label}</span>
    <span className={`text-slate-100 ${mono ? 'font-mono' : ''} ${truncate ? 'truncate' : ''}`}>{value}</span>
  </div>
);
