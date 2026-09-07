import { readView, CORE_ADDRESS, jsonResponse, errorResponse, handleOptions } from './_studionet';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return handleOptions();

  const url = new URL(req.url);
  const rawId = url.searchParams.get('id');
  if (!rawId || !/^[0-9]+$/.test(rawId)) {
    return errorResponse('missing or invalid `id` query param (integer required)', 400);
  }

  const [caseData, verdict] = await Promise.all([
    readView<Record<string, unknown>>(CORE_ADDRESS, 'get_case', [rawId]),
    readView<Record<string, unknown>>(CORE_ADDRESS, 'get_verdict', [rawId]),
  ]);

  if (!caseData.ok && !verdict.ok) {
    return errorResponse(`studionet view unavailable: ${caseData.error || verdict.error}`, 502);
  }

  return jsonResponse({
    ok: true,
    case_id: rawId,
    core: CORE_ADDRESS,
    case: caseData.ok ? caseData.data : null,
    case_error: caseData.ok ? null : caseData.error,
    verdict: verdict.ok ? verdict.data : null,
    verdict_error: verdict.ok ? null : verdict.error,
    generated_at: new Date().toISOString(),
  }, { cacheSeconds: 20 });
}
