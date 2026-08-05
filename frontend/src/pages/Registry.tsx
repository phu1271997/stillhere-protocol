import React, { useState } from 'react';
import { Database, Search, ShieldCheck } from 'lucide-react';
import { makeClient, REGISTRY_ADDRESS } from '../lib/client';

export const Registry: React.FC = () => {
  const [hashInput, setHashInput] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashInput.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask is required.');
      const [userAddr] = await window.ethereum.request({ method: 'eth_accounts' });

      const client = makeClient((userAddr || '0x0000000000000000000000000000000000000000') as `0x${string}`);
      const status = await client.readContract({
        address: REGISTRY_ADDRESS,
        functionName: 'get_status',
        args: [hashInput.trim()],
      });
      setResult(status);
    } catch (err: any) {
      setResult({
        verdict_label: 'UNKNOWN',
        highest_confidence: 0,
        case_count: 0,
        last_updated: 0,
      });
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
            Search canonical `profile_hash` to check existing GenLayer AI Jury assessments. To preserve privacy, plain identity text is never stored in registry lookups.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
            <input
              type="text"
              value={hashInput}
              onChange={e => setHashInput(e.target.value)}
              placeholder="Paste 0x... profile_hash"
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {searched && (
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registry Lookup Result</span>
            <span className="font-mono text-xs text-slate-500 truncate max-w-xs">{hashInput}</span>
          </div>

          {result && result.verdict_label !== 'UNKNOWN' ? (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-brand-400" />
                <div>
                  <h4 className="font-bold text-white text-lg">{result.verdict_label}</h4>
                  <span className="text-xs text-slate-400">Total Cases Evaluated: {result.case_count}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-emerald-400">{result.highest_confidence}%</span>
                <span className="block text-xs text-slate-400">Highest Confidence</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">
              No previous AI Jury cases registered for this profile hash.
              <span className="block text-xs text-slate-500 mt-1">Absence of a record does not guarantee authenticity.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
