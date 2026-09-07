/**
 * JSON Feed 1.1 for StillHere case verdicts.
 * https://www.jsonfeed.org/version/1.1/
 *
 * Companion to /api/feed.xml — same underlying reads, machine-friendly JSON
 * shape for integrations that would rather consume JSON than XML.
 */
import { readView, CORE_ADDRESS, jsonResponse } from './_studionet';

export const config = { runtime: 'edge' };

const APP_ORIGIN = 'https://stillhere-protocol-two.vercel.app';
const FEED_LIMIT = 50;

interface Summary {
  caseId: string;
  label: string;
  confidence: number;
  submittedAt: number;
  finalizedAt: number;
  requester: string;
}

async function fetchCaseSummary(caseId: string): Promise<Summary | null> {
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
  let items: any[] = [];
  let notice: string | null = null;

  if (listR.ok && Array.isArray(listR.data) && listR.data.length > 0) {
    const summaries = (await Promise.all(listR.data.map(fetchCaseSummary))).filter(Boolean) as Summary[];
    items = summaries.map(s => ({
      id: `urn:stillhere:case:${s.caseId}`,
      url: `${APP_ORIGIN}/verdict/${s.caseId}`,
      external_url: `${APP_ORIGIN}/verdict/${s.caseId}`,
      title: `Case #${s.caseId} — ${s.label}${s.confidence ? ` (${s.confidence}%)` : ''}`,
      content_text: `Verdict: ${s.label}${s.confidence ? ` at ${s.confidence}% confidence` : ''}. Requester ${s.requester}. Advisory only — not a legal determination.`,
      date_published: s.submittedAt ? new Date(s.submittedAt * 1000).toISOString() : undefined,
      date_modified: s.finalizedAt ? new Date(s.finalizedAt * 1000).toISOString() : undefined,
      tags: [s.label],
      _stillhere: {
        case_id: s.caseId,
        label: s.label,
        confidence: s.confidence,
        requester: s.requester,
      },
    }));
  } else {
    notice = listR.error || 'index empty';
  }

  return jsonResponse({
    version: 'https://jsonfeed.org/version/1.1',
    title: 'StillHere — On-chain Romance Scam Verdicts',
    home_page_url: `${APP_ORIGIN}/explorer`,
    feed_url: `${APP_ORIGIN}/api/feed.json`,
    description: 'Advisory verdicts from a decentralized AI Jury on GenLayer. Not legal determinations.',
    language: 'en',
    icon: `${APP_ORIGIN}/logo-512.png`,
    favicon: `${APP_ORIGIN}/logo-512.png`,
    authors: [{ name: 'StillHere Protocol', url: APP_ORIGIN }],
    _stillhere: {
      core: CORE_ADDRESS,
      count: items.length,
      notice,
      generated_at: new Date().toISOString(),
    },
    items,
  }, { cacheSeconds: 60 });
}
