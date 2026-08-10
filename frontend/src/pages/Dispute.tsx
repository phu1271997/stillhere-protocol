import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scale, Plus, Send, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CORE_ADDRESS, sendGenLayerTransaction, waitForFinalizedTx } from '../lib/client';
import { updateCase, loadCase } from '../lib/caseStore';

export const Dispute: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const caseId = id || '';

  const [counterUrlInput, setCounterUrlInput] = useState('');
  const [counterUrls, setCounterUrls] = useState<string[]>([]);
  const [chatSample, setChatSample] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) navigate('/');
  }, [caseId, navigate]);

  const handleAddUrl = () => {
    if (counterUrlInput.trim()) {
      setCounterUrls([...counterUrls, counterUrlInput.trim()]);
      setCounterUrlInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMsg(null);
    const finalUrls = counterUrls.length > 0 ? counterUrls : (counterUrlInput.trim() ? [counterUrlInput.trim()] : []);
    if (finalUrls.length === 0) {
      setError('At least one counter-evidence URL is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask is required.');
      const [userAddr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!userAddr) throw new Error('No wallet account available.');

      const disputeFee = BigInt('2000000000000000');

      setStatusMsg('Waiting for MetaMask signature…');
      const txHash = await sendGenLayerTransaction({
        userAddress: userAddr as `0x${string}`,
        contractAddress: CORE_ADDRESS,
        functionName: 'file_dispute',
        args: [caseId, finalUrls, chatSample],
        value: disputeFee,
      });

      setStatusMsg('Dispute submitted. Polling studionet for finalization…');
      await waitForFinalizedTx(txHash, { pollMs: 3000, timeoutMs: 240_000 });

      if (loadCase(caseId)) {
        updateCase(caseId, {
          disputeTxHash: txHash,
          disputedAt: Math.floor(Date.now() / 1000),
        });
      }

      navigate(`/pending/${caseId}?tx=${txHash}`);
    } catch (err: any) {
      setError(err.message || 'Dispute submission failed');
      setStatusMsg(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col gap-4">
      <Link to={`/verdict/${caseId}`} className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1 self-start">
        <ArrowLeft className="w-4 h-4" /> Back to verdict
      </Link>

      <div className="glass-panel p-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Scale className="w-6 h-6 text-amber-400" />
          File Counter-Evidence Dispute
        </h2>
        <p className="text-sm text-slate-400 mb-1">
          Submit official proof or counter-evidence URLs to request an appellate Round 2 AI Jury re-adjudication.
        </p>
        <p className="text-xs text-slate-500 mb-6 font-mono">Case ID: #{caseId}</p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-600/60 text-xs text-rose-300" role="alert">
            {error}
          </div>
        )}

        {statusMsg && !error && (
          <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300" aria-live="polite">
            {statusMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Counter-Evidence URLs *
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={counterUrlInput}
                onChange={e => setCounterUrlInput(e.target.value)}
                placeholder="https://official-registry.gov/proof"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {counterUrls.length > 0 && (
              <ul className="flex flex-col gap-1 mt-2">
                {counterUrls.map((u, i) => (
                  <li key={i} className="text-xs font-mono bg-slate-950/80 p-2 rounded border border-slate-800 text-slate-300 truncate">
                    {u}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Additional Clarification Context</label>
            <textarea
              rows={3}
              value={chatSample}
              onChange={e => setChatSample(e.target.value)}
              placeholder="Provide additional context explaining why the initial assessment should be re-evaluated..."
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-base shadow-xl shadow-amber-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? (statusMsg || 'Submitting Dispute…') : 'Submit Round 2 Dispute'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
