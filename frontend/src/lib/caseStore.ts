export interface StoredCaseMeta {
  caseId: string;
  txHash: string;
  requester: string;
  profileHash: string;
  claimedIdentityHash: string;
  chatSampleHash: string;
  publicUrls: string[];
  imageUrls: string[];
  submittedAt: number;
  claimedName?: string;
  claimedCountry?: string;
  bountyTopupWei: string;
  disputeTxHash?: string;
  disputedAt?: number;
}

const KEY_PREFIX = 'stillhere:case:';
const INDEX_KEY = 'stillhere:cases';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveCase(meta: StoredCaseMeta): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_PREFIX + meta.caseId, JSON.stringify(meta));
    const list = safeParse<string[]>(localStorage.getItem(INDEX_KEY)) ?? [];
    if (!list.includes(meta.caseId)) {
      list.push(meta.caseId);
      localStorage.setItem(INDEX_KEY, JSON.stringify(list));
    }
  } catch {
    // localStorage may be disabled — non-fatal
  }
}

export function loadCase(caseId: string): StoredCaseMeta | null {
  if (typeof window === 'undefined') return null;
  return safeParse<StoredCaseMeta>(localStorage.getItem(KEY_PREFIX + caseId));
}

export function updateCase(caseId: string, patch: Partial<StoredCaseMeta>): StoredCaseMeta | null {
  const existing = loadCase(caseId);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  saveCase(merged);
  return merged;
}

export function listCaseIds(): string[] {
  if (typeof window === 'undefined') return [];
  return safeParse<string[]>(localStorage.getItem(INDEX_KEY)) ?? [];
}
