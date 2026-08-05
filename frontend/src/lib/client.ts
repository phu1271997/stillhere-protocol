import { createClient, createAccount } from 'genlayer-js';
import { simulator } from 'genlayer-js/chains';

if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
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

export const CORE_ADDRESS = ((import.meta as any).env?.VITE_CORE_ADDRESS || '0x2b96674AD3480e198B5704e6535bcC72Ab535A5e') as `0x${string}`;
export const REGISTRY_ADDRESS = ((import.meta as any).env?.VITE_REGISTRY_ADDRESS || '0xd4826725f78449CD61D33A43dBb167ABE353Cbdc') as `0x${string}`;
