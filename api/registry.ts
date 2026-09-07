import { readView, REGISTRY_ADDRESS, jsonResponse, errorResponse, handleOptions } from './_studionet';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return handleOptions();

  const url = new URL(req.url);
  const rawHash = url.searchParams.get('hash');
  if (!rawHash || !/^0x[a-f0-9]{6,}$/i.test(rawHash)) {
    return errorResponse('missing or invalid `hash` query param (0x-prefixed hex required)', 400);
  }
  const canon = rawHash.toLowerCase();

  const [status, watcherCount] = await Promise.all([
    readView<Record<string, unknown>>(REGISTRY_ADDRESS, 'get_status', [canon]),
    readView<number | string>(REGISTRY_ADDRESS, 'get_watcher_count', [canon]),
  ]);

  if (!status.ok) return errorResponse(`studionet view unavailable: ${status.error}`, 502);

  return jsonResponse({
    ok: true,
    profile_hash: canon,
    registry: REGISTRY_ADDRESS,
    status: status.data,
    watcher_count: watcherCount.ok ? Number(watcherCount.data) : null,
    generated_at: new Date().toISOString(),
  }, { cacheSeconds: 30 });
}
