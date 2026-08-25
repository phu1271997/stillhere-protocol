import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Info } from 'lucide-react';
import { keccak256, toBytes } from 'viem';
import { CORE_ADDRESS, sendGenLayerTransaction, waitForFinalizedTx, explorerTxUrl } from '../lib/client';

export const Contribute: React.FC = () => {
  const { id } = useParams();
  const caseId = id || '';

  const [url, setUrl] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMsg(null);
    setTxHash(null);
    const trimmed = url.trim();
    if (!trimmed) { setError('An evidence URL is required.'); return; }
    if (trimmed.length > 512) { setError('URL is too long (max 512 chars).'); return; }

    setSubmitting(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask is required.');
      const [userAddr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!userAddr) throw new Error('No wallet account available.');

      const evidenceHash = keccak256(toBytes(trimmed.toLowerCase()));

      setStatusMsg('Waiting for MetaMask signature…');
      const tx = await sendGenLayerTransaction({
        userAddress: userAddr as `0x${string}`,
        contractAddress: CORE_ADDRESS,
        functionName: 'contribute_evidence',
        args: [caseId, trimmed, evidenceHash],
      });
      setStatusMsg('Contribution submitted. Polling studionet for finalization…');
      await waitForFinalizedTx(tx, { pollMs: 3000, timeoutMs: 180_000 });
      setTxHash(tx);
      setStatusMsg('Contribution finalized on-chain.');
      setUrl('');
    } catch (err: any) {
      setError(err?.message || 'Contribution submission failed.');
      setStatusMsg(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col gap-4">
      <Link
        to={`/verdict/${caseId}`}
        className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1 self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Back to verdict
      </Link>

      <div className="glass-panel p-8">
        <h2 className="text-2xl font-bold text-white mb-2">Contribute Evidence</h2>
        <p className="text-sm text-slate-400 mb-1">
          Add a public URL (news article, court record, another dating-scam registry entry) that the AI Jury should weigh
          when the case is re-adjudicated.
        </p>
        <p className="text-xs text-slate-500 mb-6 font-mono">Case ID: #{caseId}</p>

        <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span>Contributions are stored on-chain and used by the AI Jury when a dispute triggers a Round 2 re-adjudication.</span>
            <span>If the case verdict ends up SUSPICIOUS or LIKELY_SCAM_RING, contributors can claim a bounty share
              proportional to <code className="font-mono text-brand-300">contributor_share_bps</code> — see ECONOMICS.md.</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-950/80 border border-rose-600/60 text-xs text-rose-300" role="alert">
            {error}
          </div>
        )}
        {statusMsg && !error && (
          <div className="mb-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300" aria-live="polite">
            {statusMsg}
          </div>
        )}
        {txHash && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/40 text-xs text-emerald-200">
            Contribution tx finalized:{' '}
            <a href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer" className="font-mono underline">
              {txHash.slice(0, 12)}…{txHash.slice(-8)}
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Evidence URL *</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://news-site.example/scam-report"
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            />
            <span className="text-xs text-slate-500">
              We hash it as <code className="font-mono text-brand-300">keccak256(url.toLowerCase())</code> on-chain for
              deduplication. Contributors can't register the same URL twice per case.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-base shadow-xl shadow-brand-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? (statusMsg || 'Submitting contribution…') : 'Submit Contribution'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
