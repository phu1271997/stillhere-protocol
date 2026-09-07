import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ExternalLink,
  Rss,
  FileJson,
  ClipboardCopy,
  RefreshCcw,
  Filter,
  AlertCircle,
} from 'lucide-react';
import {
  readView,
  CORE_ADDRESS,
  explorerAddressUrl,
  explorerTxUrl,
} from '../lib/client';
import { listCaseIds, loadCase, StoredCaseMeta } from '../lib/caseStore';
import { useI18n } from '../lib/i18n';

type Verdict = 'ALL' | 'LIKELY_REAL' | 'INCONCLUSIVE' | 'SUSPICIOUS' | 'LIKELY_SCAM_RING' | 'PENDING' | 'VERDICT' | 'FAILED';

interface Row {
  caseId: string;
  verdictLabel: string | null;
  confidence: number | null;
  submittedAt: number | null;
  requester: string | null;
  publicUrls: string[];
  txHash: string | null;
  source: 'chain' | 'local';
}

async function fetchChainRow(caseId: string): Promise<Row | null> {
  try {
    const [caseR, verdictR] = await Promise.all([
      readView<any>(CORE_ADDRESS, 'get_case', [caseId]),
      readView<any>(CORE_ADDRESS, 'get_verdict', [caseId]),
    ]);
    if (!caseR.ok || !caseR.data) return null;
    const c: any = caseR.data;
    const v: any = verdictR.ok ? verdictR.data : null;
    return {
      caseId,
      verdictLabel: v?.label ? String(v.label) : String(c.state || 'PENDING'),
      confidence: v?.confidence != null ? Number(v.confidence) : null,
      submittedAt: c.submitted_at != null ? Number(c.submitted_at) : null,
      requester: c.requester ? String(c.requester).toLowerCase() : null,
      publicUrls: Array.isArray(c.public_urls) ? c.public_urls : [],
      txHash: null,
      source: 'chain',
    };
  } catch {
    return null;
  }
}

function rowFromLocal(meta: StoredCaseMeta): Row {
  return {
    caseId: meta.caseId,
    verdictLabel: 'UNKNOWN',
    confidence: null,
    submittedAt: meta.submittedAt,
    requester: meta.requester,
    publicUrls: meta.publicUrls || [],
    txHash: meta.txHash || null,
    source: 'local',
  };
}

const VERDICT_STYLES: Record<string, string> = {
  LIKELY_REAL: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  INCONCLUSIVE: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  SUSPICIOUS: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  LIKELY_SCAM_RING: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  PENDING: 'bg-brand-500/10 text-brand-300 border-brand-500/30',
  VERDICT: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  RE_VERDICT: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  FAILED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  UNKNOWN: 'bg-slate-800 text-slate-400 border-slate-700',
};

export const Explorer: React.FC = () => {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Verdict>('ALL');
  const [query, setQuery] = useState('');
  const [chainErr, setChainErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [feedOrigin, setFeedOrigin] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') setFeedOrigin(window.location.origin);
  }, []);

  const load = async () => {
    setLoading(true);
    setChainErr(null);

    // Step 1 - snapshot from local cases so users always see their own history.
    const localIds = listCaseIds();
    const localRows: Row[] = localIds
      .map(id => loadCase(id))
      .filter((c): c is StoredCaseMeta => c != null)
      .map(rowFromLocal);

    // Step 2 - hydrate from chain if the new v0.3.0 endpoint is deployed. On the
    // current v0.2.16 live contract this call will fail; we degrade gracefully
    // to local-only rows and surface a hint.
    let chainRows: Row[] = [];
    try {
      const listR = await readView<string[]>(CORE_ADDRESS, 'list_recent_case_ids', [0, 100]);
      if (listR.ok && Array.isArray(listR.data)) {
        const results = await Promise.all(listR.data.map(fetchChainRow));
        chainRows = results.filter((r): r is Row => r != null);
      } else if (listR.error) {
        setChainErr(listR.error);
      }
    } catch (e: any) {
      setChainErr(e?.message || String(e));
    }

    // Merge - chain rows win over local rows for the same id.
    const byId = new Map<string, Row>();
    for (const r of localRows) byId.set(r.caseId, r);
    for (const r of chainRows) byId.set(r.caseId, r);
    const merged = Array.from(byId.values());
    merged.sort((a, b) => {
      const ta = a.submittedAt ?? 0;
      const tb = b.submittedAt ?? 0;
      if (ta !== tb) return tb - ta;
      return b.caseId.localeCompare(a.caseId);
    });
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      if (filter !== 'ALL' && r.verdictLabel !== filter) return false;
      if (!q) return true;
      if (r.caseId === q) return true;
      if (r.requester && r.requester.includes(q)) return true;
      if (r.publicUrls.some(u => u.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [rows, filter, query]);

  const chainAvailable = rows.some(r => r.source === 'chain');

  const copyShare = async (caseId: string) => {
    try {
      const url = `${feedOrigin}/verdict/${caseId}`;
      await navigator.clipboard.writeText(url);
      setCopied(caseId);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 flex flex-col gap-6">
      <div className="glass-panel p-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Search className="w-6 h-6 text-brand-500" /> {t('explorer.title')}
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">{t('explorer.subtitle')}</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> {loading ? '…' : 'Reload'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wider text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Filter className="w-3 h-3" /> {t('explorer.filter.label')}</span>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as Verdict)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
            >
              <option value="ALL">{t('explorer.filter.all')}</option>
              <option value="LIKELY_REAL">LIKELY_REAL</option>
              <option value="INCONCLUSIVE">INCONCLUSIVE</option>
              <option value="SUSPICIOUS">SUSPICIOUS</option>
              <option value="LIKELY_SCAM_RING">LIKELY_SCAM_RING</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wider text-slate-400">
            <span>Search</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('explorer.search.placeholder')}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800 text-xs">
          <span className="text-slate-400">{t('explorer.feed.label')}:</span>
          <a
            href="/api/feed.xml"
            target="_blank"
            rel="noreferrer"
            className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
          >
            <Rss className="w-3.5 h-3.5" /> {t('explorer.feed.atom')}
          </a>
          <a
            href="/api/feed.json"
            target="_blank"
            rel="noreferrer"
            className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
          >
            <FileJson className="w-3.5 h-3.5" /> {t('explorer.feed.json')}
          </a>
        </div>

        {chainErr && !chainAvailable && (
          <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{t('explorer.hint.local')} <span className="font-mono text-amber-300 opacity-70">({chainErr})</span></span>
          </div>
        )}
      </div>

      <div className="glass-panel p-2 sm:p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-400">
              <th className="text-left py-2 px-2 font-semibold">{t('explorer.header.case')}</th>
              <th className="text-left py-2 px-2 font-semibold">{t('explorer.header.verdict')}</th>
              <th className="text-right py-2 px-2 font-semibold">{t('explorer.header.confidence')}</th>
              <th className="text-left py-2 px-2 font-semibold">{t('explorer.header.submitted')}</th>
              <th className="text-left py-2 px-2 font-semibold">{t('explorer.header.requester')}</th>
              <th className="text-right py-2 px-2 font-semibold">{t('explorer.header.share')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-400">{t('explorer.empty')}</td>
              </tr>
            )}
            {filtered.map(r => {
              const style = VERDICT_STYLES[r.verdictLabel || 'UNKNOWN'] || VERDICT_STYLES.UNKNOWN;
              return (
                <tr key={r.caseId} className="border-t border-slate-800/60 hover:bg-slate-900/40">
                  <td className="py-2 px-2 font-mono text-slate-100">
                    <Link to={`/verdict/${r.caseId}`} className="text-brand-300 hover:text-brand-200">#{r.caseId}</Link>
                    {r.source === 'local' && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500">local</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono ${style}`}>{r.verdictLabel}</span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-300">{r.confidence != null ? `${r.confidence}%` : '—'}</td>
                  <td className="py-2 px-2 text-xs text-slate-400">{r.submittedAt ? new Date(r.submittedAt * 1000).toLocaleString() : '—'}</td>
                  <td className="py-2 px-2 font-mono text-xs text-slate-400">
                    {r.requester ? (
                      <Link to={`/trust/${r.requester}`} className="hover:text-brand-300">
                        {r.requester.slice(0, 6)}…{r.requester.slice(-4)}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => copyShare(r.caseId)}
                        aria-label="Copy share link"
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-brand-300"
                      >
                        <ClipboardCopy className="w-3.5 h-3.5" />
                      </button>
                      {r.txHash && (
                        <a
                          href={explorerTxUrl(r.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-brand-300"
                          aria-label="Open tx on Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {copied && (
        <div className="fixed bottom-6 right-6 z-30 px-3 py-2 rounded-lg bg-slate-900 border border-brand-500/40 text-xs text-brand-200 shadow-lg">
          {t('explorer.share.copied')}: #{copied}
        </div>
      )}

      <div className="glass-card p-4 text-xs text-slate-400 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-brand-400" />
          <a href={explorerAddressUrl(CORE_ADDRESS)} target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300">
            Core contract on GenLayer Explorer
          </a>
        </div>
        <div className="text-slate-500">
          Contract-side aggregation reads <code className="font-mono text-brand-300">list_recent_case_ids</code> +{' '}
          <code className="font-mono text-brand-300">get_case</code> — landed in v0.3.0.
        </div>
      </div>
    </div>
  );
};
