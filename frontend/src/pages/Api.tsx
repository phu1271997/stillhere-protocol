import React from 'react';
import { Terminal, ExternalLink, Code2, ShieldCheck } from 'lucide-react';

interface Endpoint {
  method: 'GET';
  path: string;
  purpose: string;
  params?: Array<{ name: string; type: string; note: string }>;
  example: string;
  responseSketch: string;
  cache: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/stats',
    purpose: 'Aggregate protocol counters — total cases, unique profiles, per-label verdict histogram, pause state.',
    example: 'curl -sS https://stillhere-protocol.vercel.app/api/stats',
    responseSketch: `{
  "ok": true, "total_cases": 42, "total_profiles": 27, "paused": false,
  "verdicts_recorded": 40, "scam_share_percent": 55,
  "verdict_counts": { "LIKELY_REAL": 10, "INCONCLUSIVE": 8,
                      "SUSPICIOUS": 15, "LIKELY_SCAM_RING": 7 }
}`,
    cache: '30 s edge cache',
  },
  {
    method: 'GET',
    path: '/api/cases',
    purpose: 'Paginated list of the most recent case ids (reverse-chron).',
    params: [
      { name: 'offset', type: 'int', note: 'Number of newest cases to skip. Default 0.' },
      { name: 'limit', type: 'int', note: '1..100. Default 25.' },
    ],
    example: 'curl -sS "https://stillhere-protocol.vercel.app/api/cases?limit=5"',
    responseSketch: `{
  "ok": true, "offset": 0, "limit": 5, "total_cases": 42,
  "case_ids": ["41", "40", "39", "38", "37"]
}`,
    cache: '20 s edge cache',
  },
  {
    method: 'GET',
    path: '/api/case/:id',
    purpose: 'Fetch the full on-chain case + verdict payload for a case id.',
    params: [{ name: ':id', type: 'int', note: 'Path segment. Integer case id.' }],
    example: 'curl -sS https://stillhere-protocol.vercel.app/api/case/7',
    responseSketch: `{
  "ok": true, "case_id": "7",
  "case": { "state": "VERDICT", "public_urls": [...], "profile_hash": "0x…" },
  "verdict": { "label": "SUSPICIOUS", "confidence": 78, "red_flags": [...] }
}`,
    cache: '20 s edge cache',
  },
  {
    method: 'GET',
    path: '/api/registry/:hash',
    purpose: 'Aggregate profile status + watcher count for a canonical profile hash.',
    params: [{ name: ':hash', type: 'hex', note: '0x-prefixed profile hash.' }],
    example: 'curl -sS https://stillhere-protocol.vercel.app/api/registry/0xabcd…',
    responseSketch: `{
  "ok": true, "profile_hash": "0xabcd…",
  "status": { "verdict_label": "SUSPICIOUS", "highest_confidence": 82, "case_count": 3 },
  "watcher_count": 4
}`,
    cache: '30 s edge cache',
  },
  {
    method: 'GET',
    path: '/api/trust/:addr',
    purpose: 'Trust tier + full RequesterStats for a wallet address.',
    params: [{ name: ':addr', type: 'address', note: '0x-prefixed 40-hex wallet address.' }],
    example: 'curl -sS https://stillhere-protocol.vercel.app/api/trust/0x1234…',
    responseSketch: `{
  "ok": true, "address": "0x1234…", "tier": "GUARDIAN",
  "stats": { "total_cases": 12, "scam_hits": 5, "real_hits": 3, "failed_cases": 0 }
}`,
    cache: '60 s edge cache',
  },
];

export const Api: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-6">
      <div className="glass-panel p-6 flex flex-col gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-6 h-6 text-brand-500" />
          Public JSON API
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Read-only JSON on top of studionet, served from Vercel Edge Functions. No auth required, CORS is wide open,
          responses are edge-cached with <code className="text-brand-300">stale-while-revalidate</code> for 30 s.
          Every endpoint returns <code className="text-brand-300">{'{ ok: boolean, … }'}</code>. Errors return HTTP 400
          or 502 with <code className="text-brand-300">{'{ ok: false, error: string }'}</code>.
        </p>
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <span>
            <b>Design note.</b> The API is a thin decoding proxy over the studionet contracts — it reads via{' '}
            <code className="text-brand-300">eth_call</code> and hex-decodes the returned payload. Nothing is stored
            server-side, no logs are persisted, and the same read is available directly on-chain if the edge is down.
          </span>
        </div>
      </div>

      {ENDPOINTS.map(ep => (
        <div key={ep.path} className="glass-panel p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-brand-600 text-white text-xs font-mono uppercase">{ep.method}</span>
            <code className="font-mono text-sm text-brand-300">{ep.path}</code>
            <span className="ml-auto text-[10px] text-slate-500 uppercase tracking-wider">{ep.cache}</span>
          </div>
          <p className="text-sm text-slate-300">{ep.purpose}</p>
          {ep.params && (
            <ul className="text-xs text-slate-400 flex flex-col gap-1 pl-4 list-disc">
              {ep.params.map(p => (
                <li key={p.name}>
                  <code className="text-brand-300 font-mono">{p.name}</code> <span className="text-slate-500">({p.type})</span> — {p.note}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-1 pt-1 border-t border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 inline-flex items-center gap-1"><Code2 className="w-3 h-3" /> Example</span>
            <pre className="text-xs font-mono text-slate-100 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto">{ep.example}</pre>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 mt-2">Response shape</span>
            <pre className="text-xs font-mono text-slate-300 bg-slate-950/70 border border-slate-800 rounded-lg p-3 overflow-x-auto">{ep.responseSketch}</pre>
          </div>
        </div>
      ))}

      <div className="glass-card p-4 text-xs text-slate-400 flex items-start gap-2">
        <ExternalLink className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <span>
          Runtime: Vercel Edge (V8). Source: <code className="text-brand-300">/api/*.ts</code> in the GitHub repo. The
          same underlying RPC call is available directly from any client via <code className="text-brand-300">https://studio.genlayer.com/api</code> —
          the edge layer only adds decoding, caching, and CORS.
        </span>
      </div>
    </div>
  );
};
