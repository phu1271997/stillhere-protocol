import { createClient } from 'genlayer-js';
import { defineChain, toRlp, toHex, hexToString } from 'viem';

if (typeof BigInt !== 'undefined') {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

if (typeof JSON !== 'undefined' && JSON.stringify) {
  const origStringify = JSON.stringify;
  JSON.stringify = function (value: any, replacer?: any, space?: any) {
    const safeReplacer = (key: string, val: any) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }
      if (typeof replacer === 'function') {
        return replacer(key, val);
      }
      return val;
    };
    return origStringify(value, safeReplacer, space);
  };
}

export const STUDIONET_RPC = 'https://studio.genlayer.com/api';
export const STUDIONET_EXPLORER = 'https://explorer-studio.genlayer.com';
export const STUDIONET_CHAIN_ID = 61999;

export const studionet = defineChain({
  id: STUDIONET_CHAIN_ID,
  name: 'GenLayer Studio Network',
  nativeCurrency: { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
  rpcUrls: {
    default: { http: [STUDIONET_RPC] },
  },
  blockExplorers: {
    default: { name: 'GenLayer Explorer', url: STUDIONET_EXPLORER },
  },
  testnet: true,
});

export function makeClient(userAddress?: `0x${string}`) {
  if (!userAddress) {
    throw new Error('MetaMask account required. Call connectWallet() first.');
  }
  return createClient({
    chain: studionet as any,
    account: { address: userAddress } as any,
  });
}

export async function sendGenLayerTransaction({
  userAddress,
  contractAddress,
  functionName,
  args,
  value = 0n,
}: {
  client?: any;
  userAddress: `0x${string}`;
  contractAddress: `0x${string}`;
  functionName: string;
  args: any[];
  value?: bigint;
}): Promise<`0x${string}`> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask required to sign transactions on studionet.');
  }

  const methodParamsAsString = JSON.stringify(args);
  const data = [functionName, methodParamsAsString];
  const encodedData = toRlp(data.map(param => toHex(param)));
  const valueHex = '0x' + value.toString(16);

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from: userAddress,
      to: contractAddress,
      data: encodedData,
      value: valueHex,
    }],
  });
  return txHash as `0x${string}`;
}

async function rpc<T = any>(method: string, params: any[]): Promise<{ result?: T; error?: any }> {
  const res = await fetch(STUDIONET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
  });
  if (!res.ok) {
    throw new Error(`Studionet RPC ${method} HTTP ${res.status}`);
  }
  return res.json();
}

export interface StudionetTx {
  hash: string;
  from_address: string;
  to_address: string;
  status: string;
  result: any;
  value?: number | string;
  created_at?: string;
  triggered_transactions?: string[];
  execution_mode?: string;
  consensus_data?: any;
}

export async function fetchTransaction(txHash: `0x${string}`): Promise<StudionetTx | null> {
  const j = await rpc<StudionetTx>('eth_getTransactionByHash', [txHash]);
  return (j.result as StudionetTx) ?? null;
}

export interface TxWaitResult {
  status: string;
  caseId: string | null;
  tx: StudionetTx;
}

export async function waitForFinalizedTx(
  txHash: `0x${string}`,
  opts: { pollMs?: number; timeoutMs?: number } = {},
): Promise<TxWaitResult> {
  const pollMs = opts.pollMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const tx = await fetchTransaction(txHash);
    if (tx && (tx.status === 'FINALIZED' || tx.status === 'ACCEPTED')) {
      const caseId = tx.result === null || tx.result === undefined ? null : String(tx.result);
      return { status: tx.status, caseId, tx };
    }
    if (tx && (tx.status === 'UNDETERMINED' || tx.status === 'REVERTED')) {
      throw new Error(`Transaction ${txHash} ended in status ${tx.status}`);
    }
    await new Promise(r => setTimeout(r, pollMs));
  }
  throw new Error(`Transaction ${txHash} did not finalize within ${Math.round(timeoutMs / 1000)}s`);
}

export interface ViewResult<T = any> {
  ok: boolean;
  data?: T;
  raw?: string;
  error?: string;
}

function decodeReadResult<T>(raw: any): ViewResult<T> {
  if (raw === null || raw === undefined) {
    return { ok: false, error: 'empty result' };
  }
  if (typeof raw === 'string' && raw.startsWith('0x')) {
    try {
      const asStr = hexToString(raw as `0x${string}`);
      try {
        return { ok: true, data: JSON.parse(asStr) as T, raw: asStr };
      } catch {
        return { ok: true, data: asStr as unknown as T, raw: asStr };
      }
    } catch {
      return { ok: true, data: raw as unknown as T, raw };
    }
  }
  return { ok: true, data: raw as T };
}

export async function readView<T = any>(
  contractAddress: `0x${string}`,
  functionName: string,
  args: any[],
  fromAddress: `0x${string}` = '0x0000000000000000000000000000000000000000',
): Promise<ViewResult<T>> {
  try {
    const data = toRlp([toHex(functionName), toHex(JSON.stringify(args))]);
    const j = await rpc('eth_call', [{ from: fromAddress, to: contractAddress, data }, 'latest']);
    if (j.error) {
      return { ok: false, error: j.error?.message || 'view execution failed' };
    }
    return decodeReadResult<T>(j.result);
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export function explorerTxUrl(txHash: string): string {
  return `${STUDIONET_EXPLORER}/tx/${txHash}`;
}

export function explorerAddressUrl(addr: string): string {
  return `${STUDIONET_EXPLORER}/address/${addr}`;
}

export const CORE_ADDRESS = ((import.meta as any).env?.VITE_CORE_ADDRESS || '0x7335Ffe64BE8fD82db1f2b2793583055EB8Bc805') as `0x${string}`;
export const REGISTRY_ADDRESS = ((import.meta as any).env?.VITE_REGISTRY_ADDRESS || '0xACacF85af7532092d6D9c55E7b5EFD4B43069347') as `0x${string}`;
