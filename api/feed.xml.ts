/**
 * Atom 1.0 feed for StillHere case verdicts.
 *
 * Subscribable in Feedly, Inoreader, iOS Reader, NetNewsWire. Reads the
 * last N case ids from the Core contract, hydrates the verdict summary
 * for each, and emits an Atom feed with per-case entry links back to
 * the app's verdict detail page.
 *
 * If the v0.3.0 endpoints are not yet redeployed on studionet
 * (list_recent_case_ids / get_case), the feed emits an empty <feed>
 * with a diagnostic entry so RSS readers do not error out.
 */
import { readView, CORE_ADDRESS, STUDIONET_EXPLORER } from './_studionet';

export const config = { runtime: 'edge' };

const APP_ORIGIN = 'https://stillhere-protocol-two.vercel.app';
const FEED_LIMIT = 50;

function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoOrEpoch(unixTs: number | null | undefined): string {
  const t = Number(unixTs || 0);
  if (!Number.isFinite(t) || t <= 0) return new Date(0).toISOString();
  return new Date(t * 1000).toISOString();
}

async function fetchCaseSummary(caseId: string): Promise<{
  caseId: string;
  label: string;
  confidence: number;
  submittedAt: number;
  finalizedAt: number;
  requester: string;
} | null> {
  const [caseR, verdictR] = await Promise.all([
    readView<any>(CORE_ADDRESS, 'get_case', [caseId]),
    readView<any>(CORE_ADDRESS, 'get_verdict', [caseId]),
  ]);
  if (!caseR.ok || !caseR.data) return null;
  const c: any = caseR.data;
  const v: any = verdictR.ok ? verdictR.data : null;
  return {
    caseId,
    label: v?.label ? String(v.label) : String(c.state || 'PENDING'),
    confidence: v?.confidence != null ? Number(v.confidence) : 0,
    submittedAt: Number(c.submitted_at) || 0,
    finalizedAt: Number(v?.finalized_at) || Number(c.submitted_at) || 0,
    requester: String(c.requester || ''),
  };
}

export default async function handler(): Promise<Response> {
  const listR = await readView<string[]>(CORE_ADDRESS, 'list_recent_case_ids', [0, FEED_LIMIT]);

  const now = new Date().toISOString();
  let entriesXml = '';

  if (listR.ok && Array.isArray(listR.data) && listR.data.length > 0) {
    const summaries = (await Promise.all(listR.data.map(fetchCaseSummary))).filter(Boolean) as Awaited<ReturnType<typeof fetchCaseSummary>>[];
    entriesXml = summaries
      .map(s => {
        if (!s) return '';
        const caseUrl = `${APP_ORIGIN}/verdict/${s.caseId}`;
        const title = `Case #${s.caseId} — ${s.label}${s.confidence ? ` (${s.confidence}%)` : ''}`;
        const summary = `AI Jury verdict for case #${s.caseId}: ${s.label}${s.confidence ? ` at ${s.confidence}% confidence` : ''}. Requester ${s.requester.slice(0, 6)}…${s.requester.slice(-4)}. Advisory only.`;
        return `  <entry>
    <id>urn:stillhere:case:${xmlEscape(s.caseId)}</id>
    <title>${xmlEscape(title)}</title>
    <link href="${xmlEscape(caseUrl)}"/>
    <updated>${xmlEscape(isoOrEpoch(s.finalizedAt))}</updated>
    <published>${xmlEscape(isoOrEpoch(s.submittedAt))}</published>
    <category term="${xmlEscape(s.label)}"/>
    <author><name>${xmlEscape(s.requester || 'anon')}</name></author>
    <summary type="text">${xmlEscape(summary)}</summary>
  </entry>`;
      })
      .join('\n');
  } else {
    // Diagnostic entry so subscribers still see something.
    entriesXml = `  <entry>
    <id>urn:stillhere:diagnostic:no-index</id>
    <title>StillHere feed pending v0.3.0 contract redeploy</title>
    <link href="${xmlEscape(APP_ORIGIN)}/explorer"/>
    <updated>${xmlEscape(now)}</updated>
    <summary type="text">The Core contract on studionet does not yet expose list_recent_case_ids — the feed will populate after the v0.3.0 redeploy. Studionet Explorer: ${xmlEscape(STUDIONET_EXPLORER)}. Diagnostic: ${xmlEscape(listR.error || 'empty index')}.</summary>
  </entry>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>StillHere — On-chain Romance Scam Verdicts</title>
  <subtitle>Advisory verdicts from a decentralized AI Jury on GenLayer. Not legal determinations.</subtitle>
  <link href="${xmlEscape(APP_ORIGIN)}/api/feed.xml" rel="self" type="application/atom+xml"/>
  <link href="${xmlEscape(APP_ORIGIN)}/explorer"/>
  <id>urn:stillhere:feed:atom:v1</id>
  <updated>${xmlEscape(now)}</updated>
  <author><name>StillHere Protocol</name></author>
  <rights>Advisory — verdicts are AI outputs and NOT legal determinations of guilt.</rights>
  <generator uri="${xmlEscape(APP_ORIGIN)}" version="0.12.0">StillHere Edge</generator>
${entriesXml}
</feed>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      'content-type': 'application/atom+xml; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
