import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, ExternalLink, Inbox } from 'lucide-react';
import { listCaseIds, loadCase, StoredCaseMeta } from '../lib/caseStore';
import { explorerTxUrl } from '../lib/client';

export const Cases: React.FC = () => {
  const [rows, setRows] = useState<StoredCaseMeta[]>([]);

  useEffect(() => {
    const ids = listCaseIds();
    const loaded = ids
      .map(id => loadCase(id))
      .filter((r): r is StoredCaseMeta => r !== null)
      .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
    setRows(loaded);
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-brand-500" />
          Your Submitted Cases
        </h2>
        <Link
          to="/request"
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all"
        >
          + New Request
        </Link>
      </div>

      <p className="text-xs text-slate-400 -mt-3">
        Cases you submitted from this browser are cached in <code className="font-mono text-brand-300">localStorage</code> so
        you can jump back into the pending / verdict / dispute pages without re-typing. Clearing site data removes the local
        list, but every case remains on-chain on studionet.
      </p>

      {rows.length === 0 ? (
        <div className="glass-card p-10 flex flex-col items-center gap-3 text-center">
          <Inbox className="w-10 h-10 text-slate-500" />
          <h3 className="text-lg font-bold text-white">No cases yet</h3>
          <p className="text-sm text-slate-400 max-w-md">
            Submit your first AI Jury verification request — the case will appear here for quick access afterwards.
          </p>
          <Link
            to="/request"
            className="mt-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold"
          >
            Request Verification
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(r => (
            <div key={r.caseId} className="glass-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs px-2 py-1 rounded bg-brand-500/10 border border-brand-500/30 text-brand-300">
                    #{r.caseId}
                  </span>
                  <span className="text-sm text-slate-200 font-medium truncate">
                    {r.claimedName || 'Unnamed subject'}
                    {r.claimedCountry ? <span className="text-slate-400"> · {r.claimedCountry}</span> : null}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {r.submittedAt ? new Date(r.submittedAt * 1000).toLocaleString() : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800">
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-mono text-slate-400 truncate max-w-md" title={r.profileHash}>
                    profile: {r.profileHash.slice(0, 22)}…
                  </span>
                  {r.txHash && (
                    <a
                      href={explorerTxUrl(r.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                      tx {r.txHash.slice(0, 10)}…{r.txHash.slice(-6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/pending/${r.caseId}${r.txHash ? `?tx=${r.txHash}` : ''}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                  >
                    Pending
                  </Link>
                  <Link
                    to={`/verdict/${r.caseId}${r.txHash ? `?tx=${r.txHash}` : ''}`}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
                  >
                    Verdict
                  </Link>
                  <Link
                    to={`/dispute/${r.caseId}`}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-semibold"
                  >
                    Dispute
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
