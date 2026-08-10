import React, { useState } from 'react';
import { Database, Search, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { readView, REGISTRY_ADDRESS } from '../lib/client';
import { CaseCardSkeleton } from '../components/Skeleton';

interface ProfileStatus {
  verdict_label: string;
  highest_confidence: number;
  case_count: number;
  last_updated: number;
}

export const Registry: React.FC = () => {
  const [hashInput, setHashInput] = useState('');
  const [result, setResult] = useState<ProfileStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashInput.trim()) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    setWarning(null);
    setResult(null);
    try {
      const key = hashInput.trim().toLowerCase();
      const view = await readView<ProfileStatus>(REGISTRY_ADDRESS, 'get_status', [key]);
      if (view.ok && view.data && typeof view.data === 'object') {
        setResult(view.data);
      } else {
        setWarning(
          view.error
            ? `Registry view read failed: ${view.error}. Status is written on-chain during each verdict — check the studionet explorer for the profile hash.`
            : 'Registry returned an unexpected payload.',
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Registry lookup failed.');
    } finally {
      setLoading(false);
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
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-amber-300">Read view unavailable</span>
            <span className="text-slate-400">{warning}</span>
          </div>
        </div>
      )}

      {result && !loading && !error && !warning && (
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registry Lookup Result</span>
            <span className="font-mono text-xs text-slate-500 truncate max-w-xs">{hashInput}</span>
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
    </div>
  );
};
