import { readView, CORE_ADDRESS, jsonResponse, handleOptions } from './_studionet';

export const config = { runtime: 'edge' };

function parseInt10(x: string | null, fallback: number, min: number, max: number): number {
  if (!x) return fallback;
  const n = parseInt(x, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return handleOptions();

  const url = new URL(req.url);
  const offset = parseInt10(url.searchParams.get('offset'), 0, 0, 10_000_000);
  const limit = parseInt10(url.searchParams.get('limit'), 25, 1, 100);

  const [ids, total] = await Promise.all([
    readView<string[]>(CORE_ADDRESS, 'list_recent_case_ids', [offset, limit]),
    readView<number | string>(CORE_ADDRESS, 'get_total_cases', []),
  ]);

  return jsonResponse({
    ok: true,
    core: CORE_ADDRESS,
    offset,
    limit,
    total_cases: total.ok ? Number(total.data) : null,
    case_ids: ids.ok && Array.isArray(ids.data) ? ids.data : [],
    error: ids.ok ? null : ids.error,
    generated_at: new Date().toISOString(),
  }, { cacheSeconds: 20 });
}
