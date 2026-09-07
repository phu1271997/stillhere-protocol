/**
 * Shared studionet-RPC helpers for the Vercel Edge API.
 *
 * Milestone Phase 4 — Public JSON API. These functions run in the
 * Vercel Edge runtime (V8, no Node built-ins). Each handler under
 * ``api/`` imports from this file for consistent RLP encoding, hex
 * decoding, and cache-header wiring.
 */
import { toRlp, toHex, hexToString } from 'viem';

export const STUDIONET_RPC = 'https://studio.genlayer.com/api';
export const STUDIONET_EXPLORER = 'https://explorer-studio.genlayer.com';

// Contract addresses come from env at edge runtime. Fall back to the
// v0.2.16 addresses so a fresh clone still gets working data before
// redeploy.
const DEFAULT_CORE = '0x687446742DB54f8FEbCF6BBEEB2c47dA81CD97B5';
const DEFAULT_REGISTRY = '0xC87Eb03bE134175E0F3C5AAA0253DC83c23Ed3df';

export const CORE_ADDRESS = ((globalThis as any).process?.env?.VITE_CORE_ADDRESS as string | undefined) || DEFAULT_CORE;
export const REGISTRY_ADDRESS = ((globalThis as any).process?.env?.VITE_REGISTRY_ADDRESS as string | undefined) || DEFAULT_REGISTRY;

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

interface RpcResult<T = unknown> {
  result?: T;
  error?: { code?: number; message?: string };
}

async function rpc<T = unknown>(method: string, params: unknown[], signal?: AbortSignal): Promise<RpcResult<T>> {
  const res = await fetch(STUDIONET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Studionet RPC ${method} HTTP ${res.status}`);
  }
  return (await res.json()) as RpcResult<T>;
}

function decodeHexResult<T = unknown>(raw: unknown): T | string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return raw as T;
  if (!raw.startsWith('0x')) return raw as unknown as T;
  const asStr = hexToString(raw as `0x${string}`);
  try {
    return JSON.parse(asStr) as T;
  } catch {
    return asStr;
  }
}

export interface ReadViewResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function readView<T = unknown>(
  address: string,
  functionName: string,
  args: unknown[],
): Promise<ReadViewResult<T>> {
  try {
    const data = toRlp([toHex(functionName), toHex(JSON.stringify(args))]);
    const j = await rpc('eth_call', [{ from: ZERO_ADDR, to: address, data }, 'latest']);
    if (j.error) return { ok: false, error: j.error.message || 'view failed' };
    const decoded = decodeHexResult<T>(j.result);
    if (decoded === null || decoded === undefined) return { ok: false, error: 'empty result' };
    return { ok: true, data: decoded as T };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export interface TxLookup {
  hash?: string;
  from_address?: string;
  to_address?: string;
  status?: string;
  result?: unknown;
  created_at?: string;
}

export async function fetchTransaction(txHash: string): Promise<TxLookup | null> {
  const j = await rpc<TxLookup>('eth_getTransactionByHash', [txHash]);
  return (j.result as TxLookup | undefined) ?? null;
}

export function jsonResponse(body: unknown, opts: { status?: number; cacheSeconds?: number } = {}): Response {
  const cache = opts.cacheSeconds ?? 30;
  return new Response(JSON.stringify(body, null, 2), {
    status: opts.status ?? 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'cache-control': `public, s-maxage=${cache}, stale-while-revalidate=${cache * 4}`,
    },
  });
}

export function errorResponse(message: string, status = 502): Response {
  return jsonResponse({ ok: false, error: message }, { status, cacheSeconds: 0 });
}

export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-max-age': '3600',
    },
  });
}
