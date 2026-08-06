import { createClient } from 'genlayer-js';
import { defineChain, toRlp, toHex } from 'viem';

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
export const STUDIONET_EXPLORER = 'https://genlayer-explorer.vercel.app';
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

export const CORE_ADDRESS = ((import.meta as any).env?.VITE_CORE_ADDRESS || '0x2b96674AD3480e198B5704e6535bcC72Ab535A5e') as `0x${string}`;
export const REGISTRY_ADDRESS = ((import.meta as any).env?.VITE_REGISTRY_ADDRESS || '0xd4826725f78449CD61D33A43dBb167ABE353Cbdc') as `0x${string}`;
