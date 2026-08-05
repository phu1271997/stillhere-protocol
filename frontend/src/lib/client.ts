import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export function makeClient(userAddress: `0x${string}`) {
  return createClient({
    chain: studionet,
    account: userAddress,
  });
}

export const CORE_ADDRESS = (import.meta.env.VITE_CORE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const REGISTRY_ADDRESS = (import.meta.env.VITE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
