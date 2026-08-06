import { createClient, createAccount } from 'genlayer-js';
import { simulator } from 'genlayer-js/chains';
import { toRlp, toHex } from 'viem';

// Unconditional BigInt serialization fixes for JSON.stringify
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

export const studionet = simulator;

export function makeClient(userAddress?: string) {
  const acct = userAddress ? ({ address: userAddress } as any) : createAccount();
  return createClient({
    chain: simulator,
    account: acct,
  });
}

export async function sendGenLayerTransaction({
  client,
  userAddress,
  contractAddress,
  functionName,
  args,
  value = 0n,
}: {
  client: any;
  userAddress: `0x${string}`;
  contractAddress: `0x${string}`;
  functionName: string;
  args: any[];
  value?: bigint;
}): Promise<`0x${string}`> {
  const methodParamsAsString = JSON.stringify(args);
  const data = [functionName, methodParamsAsString];
  const encodedData = toRlp(data.map(param => toHex(param)));

  if (typeof window !== 'undefined' && window.ethereum) {
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

  // Fallback to client.writeContract
  return await client.writeContract({
    account: createAccount(),
    address: contractAddress,
    functionName,
    args,
    value,
  });
}

export const CORE_ADDRESS = ((import.meta as any).env?.VITE_CORE_ADDRESS || '0x2b96674AD3480e198B5704e6535bcC72Ab535A5e') as `0x${string}`;
export const REGISTRY_ADDRESS = ((import.meta as any).env?.VITE_REGISTRY_ADDRESS || '0xd4826725f78449CD61D33A43dBb167ABE353Cbdc') as `0x${string}`;
