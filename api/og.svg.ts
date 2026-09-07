/**
 * Server-rendered SVG "unfurl card" for a case verdict.
 *
 * Usage: /api/og.svg?id=42 → 1200×630 SVG with the case verdict, label
 * chip, confidence number, and StillHere brand. Suitable for direct
 * embedding in `<meta property="og:image" content="…">` — modern platforms
 * (Twitter/X, Discord, Telegram, Slack) render SVG unfurls; those that
 * still require raster can proxy through their own image pipeline.
 *
 * The endpoint is content-addressable per case_id, so once a verdict is
 * final the card is deterministic and cacheable for a long time. The
 * cache-control here is 5 minutes SWR to allow verdict updates from
 * dispute rounds to propagate.
 */
import { readView, CORE_ADDRESS, STUDIONET_EXPLORER } from './_studionet';

export const config = { runtime: 'edge' };

const LABEL_COLORS: Record<string, { bg: string; fg: string; band: string; title: string }> = {
  LIKELY_REAL: { bg: '#022c22', fg: '#6ee7b7', band: '#065f46', title: 'LIKELY REAL' },
  INCONCLUSIVE: { bg: '#1e293b', fg: '#cbd5e1', band: '#334155', title: 'INCONCLUSIVE' },
  SUSPICIOUS: { bg: '#78350f', fg: '#fcd34d', band: '#92400e', title: 'SUSPICIOUS' },
  LIKELY_SCAM_RING: { bg: '#450a0a', fg: '#fca5a5', band: '#7f1d1d', title: 'LIKELY SCAM RING' },
  PENDING: { bg: '#0f172a', fg: '#93c5fd', band: '#1e40af', title: 'PENDING JURY' },
  VERDICT: { bg: '#022c22', fg: '#6ee7b7', band: '#065f46', title: 'VERDICT' },
  RE_VERDICT: { bg: '#0f172a', fg: '#5eead4', band: '#134e4a', title: 'RE-VERDICT' },
  FAILED: { bg: '#450a0a', fg: '#fca5a5', band: '#7f1d1d', title: 'JURY FAILED' },
  UNKNOWN: { bg: '#1e293b', fg: '#cbd5e1', band: '#334155', title: 'UNKNOWN' },
};

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const rawId = url.searchParams.get('id') || '';
  const caseId = /^\d+$/.test(rawId) ? rawId : '?';

  let label = 'UNKNOWN';
  let confidence = 0;
  let submittedAt = 0;
  let notice: string | null = null;

  if (caseId !== '?') {
    const [caseR, verdictR] = await Promise.all([
      readView<any>(CORE_ADDRESS, 'get_case', [caseId]),
      readView<any>(CORE_ADDRESS, 'get_verdict', [caseId]),
    ]);
    if (caseR.ok && caseR.data) {
      label = String(caseR.data.state || 'UNKNOWN');
      submittedAt = Number(caseR.data.submitted_at) || 0;
    } else if (caseR.error) {
      notice = caseR.error;
    }
    if (verdictR.ok && verdictR.data) {
      const v: any = verdictR.data;
      if (v.label) label = String(v.label);
      if (v.confidence != null) confidence = Number(v.confidence);
    }
  }

  const color = LABEL_COLORS[label] || LABEL_COLORS.UNKNOWN;
  const date = submittedAt ? new Date(submittedAt * 1000).toISOString().slice(0, 10) : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="100%" stop-color="${esc(color.bg)}"/>
    </linearGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#5eead4"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="12" fill="${esc(color.band)}"/>

  <g transform="translate(60, 60)">
    <text font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-weight="800" font-size="42" fill="url(#brand)">
      Still<tspan fill="#22c55e">Here</tspan>
    </text>
    <text y="34" font-family="ui-sans-serif, system-ui" font-size="16" fill="#94a3b8" letter-spacing="4">
      DECENTRALIZED AI JURY · GENLAYER STUDIONET
    </text>
  </g>

  <g transform="translate(60, 220)">
    <text font-family="ui-monospace, SF Mono, Menlo" font-size="28" fill="#94a3b8">CASE</text>
    <text y="72" font-family="ui-sans-serif, system-ui" font-weight="800" font-size="86" fill="#ffffff">
      #${esc(caseId)}
    </text>
  </g>

  <g transform="translate(60, 400)">
    <rect x="0" y="0" rx="16" ry="16" width="1080" height="140" fill="${esc(color.band)}" opacity="0.35"/>
    <text x="32" y="52" font-family="ui-sans-serif, system-ui" font-weight="800" font-size="46" fill="${esc(color.fg)}">
      ${esc(color.title)}
    </text>
    <text x="32" y="106" font-family="ui-monospace, SF Mono, Menlo" font-size="26" fill="#e2e8f0">
      confidence ${esc(String(confidence))}%
      ${date ? `<tspan dx="40" fill="#94a3b8">submitted ${esc(date)}</tspan>` : ''}
    </text>
  </g>

  <g transform="translate(60, 570)">
    <text font-family="ui-sans-serif, system-ui" font-size="18" fill="#64748b">
      Advisory verdict — NOT a legal determination. Verify on ${esc(STUDIONET_EXPLORER)}
    </text>
  </g>

  ${notice ? `<g transform="translate(1140, 30)"><text text-anchor="end" font-family="ui-monospace" font-size="12" fill="#f87171">${esc(notice.slice(0, 50))}</text></g>` : ''}
</svg>
`;

  return new Response(svg, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=1800',
    },
  });
}
