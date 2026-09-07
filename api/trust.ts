import { readView, CORE_ADDRESS, jsonResponse, errorResponse, handleOptions } from './_studionet';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return handleOptions();

  const url = new URL(req.url);
  const rawAddr = url.searchParams.get('addr');
  if (!rawAddr || !/^0x[a-f0-9]{40}$/i.test(rawAddr)) {
    return errorResponse('missing or invalid `addr` query param (0x-prefixed 40-hex address required)', 400);
  }
  const canon = rawAddr.toLowerCase();

  const [tier, stats] = await Promise.all([
    readView<string>(CORE_ADDRESS, 'get_trust_tier', [canon]),
    readView<Record<string, unknown>>(CORE_ADDRESS, 'get_requester_stats', [canon]),
  ]);

  if (!tier.ok && !stats.ok) {
    return errorResponse(`studionet view unavailable: ${tier.error || stats.error}`, 502);
  }

  return jsonResponse({
    ok: true,
    address: canon,
    tier: tier.ok ? tier.data : null,
    tier_error: tier.ok ? null : tier.error,
    stats: stats.ok ? stats.data : null,
    stats_error: stats.ok ? null : stats.error,
    generated_at: new Date().toISOString(),
  }, { cacheSeconds: 60 });
}
