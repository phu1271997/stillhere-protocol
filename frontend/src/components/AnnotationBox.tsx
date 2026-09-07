import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, RefreshCcw, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  ANNOTATION_CATEGORIES,
  AnnotationCategory,
  OnChainAnnotation,
  annotationsContractConfigured,
  hasAnnotated,
  postAnnotation,
  readAnnotations,
} from '../lib/annotations';
import { explorerTxUrl } from '../lib/client';
import { useI18n } from '../lib/i18n';

const CATEGORY_STYLES: Record<string, string> = {
  WITNESS: 'text-brand-300 bg-brand-500/10 border-brand-500/30',
  INHERITED_PATTERN: 'text-teal-300 bg-teal-500/10 border-teal-500/30',
  COUNTER_CONTEXT: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  CORROBORATE: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  SAFETY_TIP: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
};

export const AnnotationBox: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { t } = useI18n();
  const [list, setList] = useState<OnChainAnnotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<AnnotationCategory>('WITNESS');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string; tx?: string } | null>(null);
  const [connected, setConnected] = useState<`0x${string}` | null>(null);
  const [alreadyAnnotated, setAlreadyAnnotated] = useState<boolean>(false);

  const configured = annotationsContractConfigured();

  const refresh = async () => {
    if (!configured) return;
    setLoading(true);
    const res = await readAnnotations(caseId);
    if (res.ok) setList(res.data || []);
    setLoading(false);
    if (connected) {
      setAlreadyAnnotated(await hasAnnotated(caseId, connected));
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    window.ethereum.request({ method: 'eth_accounts' }).then((accs: string[]) => {
      if (accs && accs[0]) setConnected(accs[0].toLowerCase() as `0x${string}`);
    });
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, configured, connected]);

  const handleSubmit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (typeof window === 'undefined' || !window.ethereum) throw new Error('MetaMask required');
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const { txHash } = await postAnnotation({
        caseId,
        category,
        body,
        evidenceUrl: url,
        userAddress: addr as `0x${string}`,
      });
      setMsg({ kind: 'ok', text: 'Annotation posted.', tx: txHash });
      setBody('');
      setUrl('');
      await refresh();
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-500" />
          <h4 className="font-bold text-white text-base">{t('annotate.title')}</h4>
          <span className="text-xs text-slate-400 font-mono">({list.length} {t('annotate.count')})</span>
        </div>
        <button
          onClick={refresh}
          disabled={loading || !configured}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs inline-flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Reload
        </button>
      </div>
      <p className="text-xs text-slate-400">{t('annotate.subtitle')}</p>

      {!configured && (
        <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{t('annotate.contract_missing')}</span>
        </div>
      )}

      {configured && (
        <>
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
            <label className="text-[11px] uppercase tracking-wider text-slate-400">{t('annotate.category')}</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as AnnotationCategory)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
              disabled={alreadyAnnotated}
            >
              {ANNOTATION_CATEGORIES.map(c => (
                <option key={c} value={c}>{t(`annotate.category.${c}`)}</option>
              ))}
            </select>

            <label className="text-[11px] uppercase tracking-wider text-slate-400">{t('annotate.body')}</label>
            <textarea
              rows={3}
              value={body}
              onChange={e => setBody(e.target.value)}
              disabled={alreadyAnnotated}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 disabled:opacity-50"
              placeholder="Short community context (hashed before submission)"
              maxLength={500}
            />

            <label className="text-[11px] uppercase tracking-wider text-slate-400">{t('annotate.url')}</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={alreadyAnnotated}
              placeholder="https://…"
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 disabled:opacity-50"
              maxLength={512}
            />

            <button
              onClick={handleSubmit}
              disabled={busy || alreadyAnnotated || !body.trim()}
              className="mt-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50 self-start"
            >
              <Send className="w-4 h-4" /> {busy ? '…' : t('annotate.submit')}
            </button>

            {alreadyAnnotated && (
              <p className="text-[11px] text-slate-400 italic">This wallet has already annotated this case.</p>
            )}

            {msg && (
              <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${msg.kind === 'ok' ? 'bg-emerald-950/50 border border-emerald-700/30 text-emerald-200' : 'bg-rose-950/50 border border-rose-700/30 text-rose-200'}`}>
                {msg.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <div className="flex flex-col gap-1">
                  <span>{msg.text}</span>
                  {msg.tx && (
                    <a href={explorerTxUrl(msg.tx)} target="_blank" rel="noreferrer" className="text-brand-400 inline-flex items-center gap-1">
                      view tx <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
            {list.length === 0 && !loading && (
              <p className="text-xs text-slate-500 italic">No annotations yet.</p>
            )}
            {list.map((a, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${CATEGORY_STYLES[String(a.category)] || 'text-slate-300 border-slate-700 bg-slate-800'}`}>
                    {String(a.category)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{t('annotate.author')} {String(a.author).slice(0, 6)}…{String(a.author).slice(-4)}</span>
                  <span className="text-[10px] text-slate-500">{t('annotate.posted')} {a.posted_at ? new Date(Number(a.posted_at) * 1000).toLocaleString() : '—'}</span>
                </div>
                <div className="text-xs text-slate-300 font-mono break-all">
                  body: {String(a.body_hash)}
                </div>
                {a.evidence_url && (
                  <a href={String(a.evidence_url)} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 truncate">
                    <ExternalLink className="w-3 h-3" /> {String(a.evidence_url)}
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
