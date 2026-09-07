import { keccak256, toBytes } from 'viem';
import {
  readView,
  sendGenLayerTransaction,
  waitForFinalizedTx,
  ANNOTATIONS_ADDRESS,
} from './client';

export type AnnotationCategory =
  | 'WITNESS'
  | 'INHERITED_PATTERN'
  | 'COUNTER_CONTEXT'
  | 'CORROBORATE'
  | 'SAFETY_TIP';

export const ANNOTATION_CATEGORIES: AnnotationCategory[] = [
  'WITNESS',
  'INHERITED_PATTERN',
  'COUNTER_CONTEXT',
  'CORROBORATE',
  'SAFETY_TIP',
];

export interface OnChainAnnotation {
  author: string;
  category: AnnotationCategory | string;
  body_hash: string;
  evidence_url: string;
  posted_at: number;
}

export function annotationsContractConfigured(): boolean {
  return !!ANNOTATIONS_ADDRESS && /^0x[a-fA-F0-9]{40}$/.test(ANNOTATIONS_ADDRESS);
}

export function computeAnnotationBodyHash(body: string): `0x${string}` {
  return keccak256(toBytes(body.trim()));
}

export async function readAnnotations(caseId: string): Promise<{ ok: boolean; data?: OnChainAnnotation[]; error?: string }> {
  if (!annotationsContractConfigured()) {
    return { ok: false, error: 'annotations contract not configured' };
  }
  const r = await readView<OnChainAnnotation[]>(ANNOTATIONS_ADDRESS as `0x${string}`, 'get_annotations', [caseId]);
  if (!r.ok) return { ok: false, error: r.error };
  if (!Array.isArray(r.data)) return { ok: true, data: [] };
  return { ok: true, data: r.data as OnChainAnnotation[] };
}

export async function readAnnotationCount(caseId: string): Promise<number> {
  if (!annotationsContractConfigured()) return 0;
  const r = await readView<number | string>(ANNOTATIONS_ADDRESS as `0x${string}`, 'get_annotation_count', [caseId]);
  if (!r.ok) return 0;
  return Number(r.data) || 0;
}

export async function hasAnnotated(caseId: string, author: string): Promise<boolean> {
  if (!annotationsContractConfigured()) return false;
  const r = await readView<boolean>(ANNOTATIONS_ADDRESS as `0x${string}`, 'has_annotated', [caseId, author]);
  return r.ok ? Boolean(r.data) : false;
}

export async function postAnnotation({
  caseId,
  category,
  body,
  evidenceUrl,
  userAddress,
}: {
  caseId: string;
  category: AnnotationCategory;
  body: string;
  evidenceUrl: string;
  userAddress: `0x${string}`;
}): Promise<{ txHash: `0x${string}`; bodyHash: `0x${string}` }> {
  if (!annotationsContractConfigured()) {
    throw new Error('annotations contract not configured — set VITE_ANNOTATIONS_ADDRESS');
  }
  if (!body.trim()) throw new Error('annotation body cannot be empty');
  const bodyHash = computeAnnotationBodyHash(body);
  const tx = await sendGenLayerTransaction({
    userAddress,
    contractAddress: ANNOTATIONS_ADDRESS as `0x${string}`,
    functionName: 'post_annotation',
    args: [caseId, category, bodyHash, evidenceUrl || ''],
  });
  await waitForFinalizedTx(tx, { pollMs: 3000, timeoutMs: 120_000 });
  return { txHash: tx, bodyHash };
}
