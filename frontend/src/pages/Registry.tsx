import React, { useEffect, useState } from 'react';
import {
  Database,
  Search,
  ShieldCheck,
  AlertCircle,
  Info,
  ExternalLink,
  RefreshCcw,
  BellRing,
  BellOff,
} from 'lucide-react';
import {
  readView,
  CORE_ADDRESS,
  REGISTRY_ADDRESS,
  explorerAddressUrl,
  explorerTxUrl,
  sendGenLayerTransaction,
  waitForFinalizedTx,
} from '../lib/client';
import { CaseCardSkeleton } from '../components/Skeleton';

interface ProfileStatus {
  verdict_label: string;
  highest_confidence: number;
  case_count: number;
  last_updated: number;
}

export const Registry: React.FC = () => {
  const [hashInput, setHashInput] = useState('');
  const [normalized, setNormalized] = useState<string>('');
  const [result, setResult] = useState<ProfileStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [watcherCount, setWatcherCount] = useState<number | null>(null);
  const [isWatching, setIsWatching] = useState<boolean | null>(null);
  const [connected, setConnected] = useState<`0x${string}` | null>(null);
  const [watchBusy, setWatchBusy] = useState(false);
  const [watchMsg, setWatchMsg] = useState<{ text: string; tx?: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;
      try {
        const accts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
        if (accts && accts[0]) setConnected(accts[0].toLowerCase() as `0x${string}`);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const loadWatcher = async (key: string, address?: `0x${string}` | null) => {
    try {
      const cnt = await readView<number | string>(REGISTRY_ADDRESS, 'get_watcher_count', [key]);
      if (cnt.ok) setWatcherCount(Number(cnt.data as any) || 0);
      else setWatcherCount(null);
      if (address) {
        const w = await readView<boolean | number | string>(REGISTRY_ADDRESS, 'is_watching', [key, address]);
        if (w.ok) setIsWatching(Boolean(w.data));
        else setIsWatching(null);
      } else {
        setIsWatching(null);
      }
    } catch {
      setWatcherCount(null);
      setIsWatching(null);
    }
  };

  const runLookup = async (key: string) => {
    setLoading(true);
    setSearched(true);
    setError(null);
    setWarning(null);
    setResult(null);
    setNormalized(key);
    setWatchMsg(null);
    try {
      const view = await readView<ProfileStatus>(REGISTRY_ADDRESS, 'get_status', [key]);
      if (view.ok && view.data && typeof view.data === 'object') {
        setResult(view.data);
      } else {
        setWarning(
          view.error
            ? `Studionet view execution is intermittent (${view.error}). The registry row is still written on-chain during each verdict — click the contract link below to inspect it directly on the GenLayer Explorer.`
            : 'Registry returned an unexpected payload.',
        );
      }
      await loadWatcher(key, connected);
    } catch (err: any) {
      setError(err?.message || 'Registry lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashInput.trim()) return;
    await runLookup(hashInput.trim().toLowerCase());
  };

  const handleRetry = async () => {
    if (!hashInput.trim()) return;
    await runLookup(hashInput.trim().toLowerCase());
  };

  const requireWallet = async (): Promise<`0x${string}`> => {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('MetaMask required.');
    const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setConnected((addr as string).toLowerCase() as `0x${string}`);
    return addr as `0x${string}`;
  };

  const handleSubscribe = async () => {
    if (!normalized) return;
    setWatchBusy(true);
    setWatchMsg(null);
    try {
      const addr = await requireWallet();
      const tx = await sendGenLayerTransaction({
        userAddress: addr,
        contractAddress: CORE_ADDRESS,
        functionName: 'subscribe_watcher',
        args: [normalized],
      });
      setWatchMsg({ text: 'Subscribe tx submitted, waiting for finalization…', tx });
      await waitForFinalizedTx(tx, { pollMs: 3000, timeoutMs: 120_000 });
      setWatchMsg({ text: 'Subscribed. This wallet will be recorded as a watcher for this profile.', tx });
      await loadWatcher(normalized, addr);
    } catch (err: any) {
      setWatchMsg({ text: `Subscribe failed: ${err?.message || String(err)}` });
    } finally {
      setWatchBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!normalized) return;
    setWatchBusy(true);
    setWatchMsg(null);
    try {
      const addr = await requireWallet();
      const tx = await sendGenLayerTransaction({
        userAddress: addr,
        contractAddress: CORE_ADDRESS,
        functionName: 'unsubscribe_watcher',
        args: [normalized],
      });
      setWatchMsg({ text: 'Unsubscribe tx submitted, waiting for finalization…', tx });
      await waitForFinalizedTx(tx, { pollMs: 3000, timeoutMs: 120_000 });
      setWatchMsg({ text: 'Unsubscribed.', tx });
      await loadWatcher(normalized, addr);
    } catch (err: any) {
      setWatchMsg({ text: `Unsubscribe failed: ${err?.message || String(err)}` });
    } finally {
      setWatchBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 flex flex-col gap-8">
      <div className="glass-panel p-8 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-brand-500" />
            Profile Hash Registry (E8)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Search canonical <code className="font-mono text-brand-300 text-xs">profile_hash</code> to check existing GenLayer AI Jury assessments. Plain identity text is never stored.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" aria-hidden="true" />
            <input
              type="text"
              value={hashInput}
              onChange={e => setHashInput(e.target.value)}
              placeholder="Paste 0x... profile_hash"
              aria-label="Profile hash"
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !hashInput.trim()}
            aria-label="Search registry for profile hash"
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
      </div>

      {loading && <CaseCardSkeleton />}

      {error && !loading && (
        <div className="glass-card p-4 flex items-start gap-3 border border-rose-700/40" role="alert">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-rose-300">Registry lookup failed</span>
            <span className="text-xs text-slate-400 break-words">{error}</span>
          </div>
        </div>
      )}

      {warning && !loading && !error && (
        <div className="glass-card p-4 flex items-start gap-3 border border-amber-700/40" role="status">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-2 text-xs">
            <span className="font-semibold text-amber-300">Studionet view route unavailable right now</span>
            <span className="text-slate-400">{warning}</span>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium"
              >
                <RefreshCcw className="w-3 h-3" /> Retry
              </button>
              <a
                href={explorerAddressUrl(REGISTRY_ADDRESS)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300"
              >
                Inspect on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {result && !loading && !error && !warning && (
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registry Lookup Result</span>
            <span className="font-mono text-xs text-slate-500 truncate max-w-xs">{normalized}</span>
          </div>
          {result.verdict_label && result.verdict_label !== 'UNKNOWN' ? (
            <div className="flex items-center justify-between py-2 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-brand-400" />
                <div>
                  <h4 className="font-bold text-white text-lg">{result.verdict_label}</h4>
                  <span className="text-xs text-slate-400">Cases evaluated: {result.case_count}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-emerald-400">{result.highest_confidence}%</span>
                <span className="block text-xs text-slate-400">Highest confidence</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">
              No AI Jury cases registered for this profile hash.
              <span className="block text-xs text-slate-500 mt-1">Absence of a record does not guarantee authenticity.</span>
            </div>
          )}
        </div>
      )}

      {searched && !loading && !error && (
        <div className="glass-card p-5 flex flex-col gap-3 border border-brand-500/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-brand-400" />
              <div>
                <h4 className="font-semibold text-white text-sm">Profile Watcher Subscription</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Subscribe this wallet to be listed as a watcher whenever a new verdict lands on this profile hash.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold font-mono text-brand-300">{watcherCount ?? '—'}</span>
              <span className="block text-xs text-slate-500">current watchers</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-2">
            {isWatching === true ? (
              <button
                onClick={handleUnsubscribe}
                disabled={watchBusy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-800/60 border border-slate-700 text-slate-100 text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
              >
                <BellOff className="w-3.5 h-3.5" /> Unsubscribe
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={watchBusy || !normalized}
                className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
              >
                <BellRing className="w-3.5 h-3.5" /> Subscribe as watcher
              </button>
            )}
            {connected && (
              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[12rem]">
                as {connected.slice(0, 6)}…{connected.slice(-4)}
              </span>
            )}
          </div>

          {watchMsg && (
            <div className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800 rounded-lg p-2 flex items-center gap-2 flex-wrap">
              <span>{watchMsg.text}</span>
              {watchMsg.tx && (
                <a href={explorerTxUrl(watchMsg.tx)} target="_blank" rel="noreferrer" className="text-brand-400 inline-flex items-center gap-1">
                  view tx <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
