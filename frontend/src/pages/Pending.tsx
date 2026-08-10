import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LoadingConsensus } from '../components/LoadingConsensus';
import { fetchTransaction, CORE_ADDRESS, readView, explorerTxUrl, StudionetTx } from '../lib/client';
import { ExternalLink } from 'lucide-react';

const POLL_MS = 4000;

export const Pending: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txHash = searchParams.get('tx');

  const [tx, setTx] = useState<StudionetTx | null>(null);
  const [caseState, setCaseState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const caseId = id || '';

  useEffect(() => {
    if (!caseId) {
      navigate('/');
      return;
    }
    let cancelled = false;

    async function pollLoop() {
      let ticks = 0;
      while (!cancelled) {
        ticks += 1;
        try {
          if (txHash) {
            const t = await fetchTransaction(txHash as `0x${string}`);
            if (t) setTx(t);
          }

          const caseView = await readView(CORE_ADDRESS, 'get_case', [caseId]);
          if (caseView.ok && caseView.data && typeof caseView.data === 'object') {
            const st = (caseView.data as any).state as string | undefined;
            if (st) setCaseState(st);
            if (st === 'VERDICT' || st === 'RE_VERDICT' || st === 'FAILED') {
              navigate(`/verdict/${caseId}${txHash ? `?tx=${txHash}` : ''}`);
              return;
            }
          } else if (tx && tx.status === 'FINALIZED' && ticks > 4) {
            navigate(`/verdict/${caseId}${txHash ? `?tx=${txHash}` : ''}`);
            return;
          }
        } catch (err: any) {
          setError(err?.message || 'Polling error');
        }
        await new Promise(r => setTimeout(r, POLL_MS));
      }
    }
    pollLoop();
    return () => { cancelled = true; };
  }, [caseId, txHash, navigate]);

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col gap-4">
      <LoadingConsensus />

      <div className="glass-card p-4 flex flex-col gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400 uppercase tracking-wider">Case ID</span>
          <span className="font-mono text-slate-100">#{caseId}</span>
        </div>
        {txHash && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400 uppercase tracking-wider">Tx</span>
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-brand-400 hover:text-brand-300 flex items-center gap-1 max-w-[60%] truncate"
            >
              {txHash.slice(0, 10)}…{txHash.slice(-6)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
        {tx && (
          <div className="flex justify-between">
            <span className="text-slate-400 uppercase tracking-wider">Tx Status</span>
            <span className={`font-mono ${tx.status === 'FINALIZED' ? 'text-emerald-400' : 'text-amber-400'}`}>{tx.status}</span>
          </div>
        )}
        {caseState && (
          <div className="flex justify-between">
            <span className="text-slate-400 uppercase tracking-wider">Case State</span>
            <span className="font-mono text-slate-200">{caseState}</span>
          </div>
        )}
        {error && (
          <div className="text-rose-400 pt-2 border-t border-slate-800">Poll error: {error}</div>
        )}
      </div>

      <div className="text-center">
        <Link to={`/verdict/${caseId}${txHash ? `?tx=${txHash}` : ''}`} className="text-xs text-slate-400 hover:text-slate-200 underline">
          Skip waiting — open verdict page now
        </Link>
      </div>
    </div>
  );
};
