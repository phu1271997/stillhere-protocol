import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { VerdictCard } from '../components/VerdictCard';
import { Scale, ArrowLeft, ExternalLink } from 'lucide-react';

export const VerdictDetail: React.FC = () => {
  const { id } = useParams();

  const [verdict] = useState({
    label: 'SUSPICIOUS',
    confidence: 78,
    reason: 'Profile contains conflicting career history across public sources. Reverse image search indicates one photo matched an unrelated social media account created in 2021. Chat patterns show early emotional escalation combined with financial distress queries.',
    redFlags: [
      {
        category: 'STOLEN_PHOTO',
        severity: 'CRITICAL',
        evidence: 'Primary profile photo matches unrelated account on external platform.',
      },
      {
        category: 'URGENT_EMOTIONAL',
        severity: 'WARNING',
        evidence: 'Urgent assistance requested early in communication timeline.',
      },
      {
        category: 'IDENTITY_MISMATCH',
        severity: 'WARNING',
        evidence: 'Claimed employment details inconsistent with public registry records.',
      },
    ],
    finalizedAt: Math.floor(Date.now() / 1000) - 300,
  });

  return (
    <div className="max-w-3xl mx-auto py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <span className="font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
          Case ID: #{id || '0'}
        </span>
      </div>

      <VerdictCard
        label={verdict.label}
        confidence={verdict.confidence}
        reason={verdict.reason}
        redFlags={verdict.redFlags}
        finalizedAt={verdict.finalizedAt}
      />

      <div className="glass-panel p-6 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-white text-base">Dispute or Counter-Evidence</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            If you are the Subject or have additional verification proof, submit counter-evidence for Round 2 Jury.
          </p>
        </div>
        <Link
          to={`/dispute/${id || '0'}`}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm flex items-center gap-2 transition-all shrink-0"
        >
          <Scale className="w-4 h-4 text-amber-400" />
          <span>File Dispute</span>
        </Link>
      </div>
    </div>
  );
};
