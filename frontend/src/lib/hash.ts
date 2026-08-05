import { keccak256, toBytes } from 'viem';

export function computeProfileHash(canonicalUrl: string, claimedName: string): `0x${string}` {
  const s = canonicalUrl.trim().toLowerCase() + "||" + claimedName.trim().toLowerCase();
  return keccak256(toBytes(s));
}

export function computeChatHash(chat: string): `0x${string}` {
  return keccak256(toBytes(chat));
}

export function computeIdentityHash(identity: {
  name: string;
  job?: string;
  company?: string;
  country?: string;
}): `0x${string}` {
  const s = JSON.stringify({
    n: identity.name.trim().toLowerCase(),
    j: (identity.job || "").trim().toLowerCase(),
    c: (identity.company || "").trim().toLowerCase(),
    k: (identity.country || "").trim().toLowerCase(),
  });
  return keccak256(toBytes(s));
}
