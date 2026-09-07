import {
  readView,
  CORE_ADDRESS,
  REGISTRY_ADDRESS,
  jsonResponse,
  handleOptions,
  STUDIONET_EXPLORER,
} from './_studionet';

export const config = { runtime: 'edge' };

const LABELS = ['LIKELY_REAL', 'INCONCLUSIVE', 'SUSPICIOUS', 'LIKELY_SCAM_RING'] as const;

function coerceNumber(x: unknown): number {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  if (typeof x === 'string') {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return handleOptions();

  const [total, totalProfiles, paused, ...perLabel] = await Promise.all([
    readView<number | string>(CORE_ADDRESS, 'get_total_cases', []),
    readView<number | string>(REGISTRY_ADDRESS, 'get_total_profiles', []),
    readView<boolean>(CORE_ADDRESS, 'get_paused', []),
    ...LABELS.map(l => readView<number | string>(CORE_ADDRESS, 'get_verdict_count', [l])),
  ]);

  const counts: Record<string, number> = {};
  LABELS.forEach((lbl, i) => {
    counts[lbl] = perLabel[i].ok ? coerceNumber(perLabel[i].data) : 0;
  });

  const totalVerdicts = LABELS.reduce((s, l) => s + counts[l], 0);
  const flagged = counts.SUSPICIOUS + counts.LIKELY_SCAM_RING;
  const scamShare = totalVerdicts === 0 ? 0 : Math.round((flagged / totalVerdicts) * 100);

  return jsonResponse({
    ok: true,
    protocol: 'stillhere',
    version: 1,
    core: CORE_ADDRESS,
    registry: REGISTRY_ADDRESS,
    explorer: STUDIONET_EXPLORER,
    total_cases: total.ok ? coerceNumber(total.data) : null,
    total_profiles: totalProfiles.ok ? coerceNumber(totalProfiles.data) : null,
    paused: paused.ok ? Boolean(paused.data) : null,
    verdicts_recorded: totalVerdicts,
    scam_share_percent: scamShare,
    verdict_counts: counts,
    errors: [total, totalProfiles, paused, ...perLabel]
      .filter(r => !r.ok)
      .map(r => r.error || 'unknown'),
    generated_at: new Date().toISOString(),
  }, { cacheSeconds: 30 });
}
