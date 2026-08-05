import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Plus, Trash2, Send } from 'lucide-react';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { computeProfileHash, computeChatHash, computeIdentityHash } from '../lib/hash';
import { makeClient, CORE_ADDRESS } from '../lib/client';

export const RequestVerify: React.FC = () => {
  const navigate = useNavigate();
  const [publicUrlInput, setPublicUrlInput] = useState('');
  const [publicUrls, setPublicUrls] = useState<string[]>([]);

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [claimedName, setClaimedName] = useState('');
  const [claimedJob, setClaimedJob] = useState('');
  const [claimedCompany, setClaimedCompany] = useState('');
  const [claimedCountry, setClaimedCountry] = useState('');

  const [chatSample, setChatSample] = useState('');
  const [bountyTopup, setBountyTopup] = useState('0');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPublicUrl = () => {
    if (publicUrlInput.trim()) {
      setPublicUrls([...publicUrls, publicUrlInput.trim()]);
      setPublicUrlInput('');
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImageUrls([...imageUrls, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (publicUrls.length === 0 && !publicUrlInput.trim()) {
      setError('At least one public profile URL is required.');
      return;
    }
    if (!claimedName.trim()) {
      setError('Claimed name is required.');
      return;
    }

    const finalPublicUrls = publicUrls.length > 0 ? publicUrls : [publicUrlInput.trim()];
    const finalImageUrls = imageUrls.length > 0 ? imageUrls : (imageUrlInput.trim() ? [imageUrlInput.trim()] : []);

    setSubmitting(true);

    try {
      if (!window.ethereum) throw new Error('MetaMask is required.');
      const [userAddr] = await window.ethereum.request({ method: 'eth_requestAccounts' });

      const profileHash = computeProfileHash(finalPublicUrls[0], claimedName);
      const chatHash = computeChatHash(chatSample);
      const identityHash = computeIdentityHash({
        name: claimedName,
        job: claimedJob,
        company: claimedCompany,
        country: claimedCountry,
      });

      const client = makeClient(userAddr as `0x${string}`);

      const topupVal = BigInt(bountyTopup || '0');
      const baseFee = BigInt('1000000000000000');
      const totalVal = baseFee + topupVal;

      const txHash = await client.writeContract({
        address: CORE_ADDRESS,
        functionName: 'request_verification',
        args: [
          profileHash,
          finalPublicUrls,
          finalImageUrls,
          identityHash,
          chatSample,
          chatHash,
          topupVal,
        ],
        value: totalVal,
      });

      navigate(`/pending/0?tx=${txHash}`);
    } catch (err: any) {
      setError(err.message || 'Transaction submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="glass-panel p-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-brand-500" />
          Request AI Jury Verification
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Submit public profiles and chat pattern samples for independent GenLayer AI consensus.
        </p>

        <PrivacyNotice />

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-600/60 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Public Profile URLs *
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={publicUrlInput}
                onChange={e => setPublicUrlInput(e.target.value)}
                placeholder="https://facebook.com/public-profile"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={handleAddPublicUrl}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {publicUrls.length > 0 && (
              <ul className="flex flex-col gap-1 mt-2">
                {publicUrls.map((u, i) => (
                  <li key={i} className="text-xs font-mono bg-slate-950/80 p-2 rounded border border-slate-800 flex justify-between items-center text-slate-300">
                    <span className="truncate">{u}</span>
                    <button type="button" onClick={() => setPublicUrls(publicUrls.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-3.5 h-3.5 text-rose-400 hover:text-rose-300" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Claimed Name *</label>
              <input
                type="text"
                required
                value={claimedName}
                onChange={e => setClaimedName(e.target.value)}
                placeholder="e.g. John Doe"
                className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Claimed Country</label>
              <input
                type="text"
                value={claimedCountry}
                onChange={e => setClaimedCountry(e.target.value)}
                placeholder="e.g. United States"
                className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Chat Pattern Sample (Paraphrased)</label>
            <textarea
              rows={4}
              value={chatSample}
              onChange={e => setChatSample(e.target.value)}
              placeholder="Paste anonymized chat patterns (e.g. rapid declarations of love, urgent financial requests...)"
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-brand-500 font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-base shadow-xl shadow-brand-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Submitting to AI Jury...' : 'Submit Request'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
