import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, ExternalLink, Inbox, Search, ArrowUpDown } from 'lucide-react';
import { listCaseIds, loadCase, StoredCaseMeta } from '../lib/caseStore';
import { explorerTxUrl } from '../lib/client';

type SortKey = 'submittedAt' | 'caseId';
type SortDir = 'asc' | 'desc';
type DisputeFilter = 'all' | 'disputed' | 'not_disputed';

export const Cases: React.FC = () => {
  const [rows, setRows] = useState<StoredCaseMeta[]>([]);
  const [query, setQuery] = useState('');
  const [disputeFilter, setDisputeFilter] = useState<DisputeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('submittedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    const ids = listCaseIds();
    const loaded = ids.map(loadCase).filter((r): r is StoredCaseMeta => r !== null);
    setRows(loaded);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter(
        (r) =>
          r.caseId.toLowerCase().includes(q) ||
          (r.claimedName || '').toLowerCase().includes(q) ||
          (r.claimedCountry || '').toLowerCase().includes(q) ||
          r.profileHash.toLowerCase().includes(q) ||
          (r.txHash || '').toLowerCase().includes(q),
      );
    }
    if (disputeFilter === 'disputed') out = out.filter((r) => !!r.disputeTxHash);
    if (disputeFilter === 'not_disputed') out = out.filter((r) => !r.disputeTxHash);

    const cmp = (a: StoredCaseMeta, b: StoredCaseMeta) => {
      let av: number, bv: number;
      if (sortKey === 'submittedAt') {
        av = a.submittedAt || 0;
        bv = b.submittedAt || 0;
      } else {
        av = Number(a.caseId) || 0;
        bv = Number(b.caseId) || 0;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    };
    return [...out].sort(cmp);
  }, [rows, query, disputeFilter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(k);
      setSortDir('desc');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-brand-500" />
          Your Submitted Cases
        </h2>
        <Link
          to="/request"
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          + New Request
        </Link>
      </div>

      <p className="text-xs text-slate-400 -mt-3">
        Cases submitted from this browser are cached in <code className="font-mono text-brand-300">localStorage</code>.
        Clearing site data drops the local list — every case still lives on-chain on studionet.
      </p>

      {rows.length > 0 && (
        <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by case id, name, country, profile hash, tx hash"
              aria-label="Filter cases"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-400/40"
            />
          </div>

          <label className="sr-only" htmlFor="dispute-filter">Filter dispute status</label>
          <select
            id="dispute-filter"
            value={disputeFilter}
            onChange={(e) => setDisputeFilter(e.target.value as DisputeFilter)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus-visible:outline-none focus-visible:border-brand-500"
          >
            <option value="all">All cases</option>
            <option value="disputed">Disputed only</option>
            <option value="not_disputed">Not disputed</option>
          </select>

          <div className="inline-flex rounded-lg border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSort('submittedAt')}
              aria-pressed={sortKey === 'submittedAt'}
              className={`px-3 py-2 text-xs font-medium inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${sortKey === 'submittedAt' ? 'bg-brand-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-900'}`}
            >
              Date <ArrowUpDown className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => toggleSort('caseId')}
              aria-pressed={sortKey === 'caseId'}
              className={`px-3 py-2 text-xs font-medium inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${sortKey === 'caseId' ? 'bg-brand-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-900'}`}
            >
              Case ID <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="glass-card p-10 flex flex-col items-center gap-3 text-center">
          <Inbox className="w-10 h-10 text-slate-500" />
          <h3 className="text-lg font-bold text-white">No cases yet</h3>
          <p className="text-sm text-slate-400 max-w-md">
            Submit your first AI Jury verification request — the case will appear here for quick access afterwards.
          </p>
          <Link
            to="/request"
            className="mt-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            Request Verification
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 flex flex-col items-center gap-2 text-center text-sm text-slate-400">
          <span>No case matches this filter.</span>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setDisputeFilter('all');
            }}
            className="text-xs text-brand-400 hover:text-brand-300 underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3" aria-live="polite">
          <span className="text-xs text-slate-500">
            Showing {filtered.length} of {rows.length} case{rows.length === 1 ? '' : 's'}
          </span>
          {filtered.map((r) => (
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
                  {r.disputeTxHash && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      Disputed
                    </span>
                  )}
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
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    Pending
                  </Link>
                  <Link
                    to={`/verdict/${r.caseId}${r.txHash ? `?tx=${r.txHash}` : ''}`}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    Verdict
                  </Link>
                  <Link
                    to={`/dispute/${r.caseId}`}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
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
