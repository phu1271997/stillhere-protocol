import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingConsensus } from '../components/LoadingConsensus';

export const Pending: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txHash = searchParams.get('tx');

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(`/verdict/${id || '0'}`);
    }, 15000);
    return () => clearTimeout(timer);
  }, [id, navigate]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <LoadingConsensus />
      {txHash && (
        <div className="text-center font-mono text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          Tx Hash: <span className="text-brand-400 select-all">{txHash}</span>
        </div>
      )}
    </div>
  );
};
