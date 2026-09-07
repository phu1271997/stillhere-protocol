/**
 * Client-side envelope encryption for chat samples.
 *
 * Milestone Phase 4 — Loại 3a. All crypto happens in the browser via
 * WebCrypto. The plaintext chat is never sent to any server, never
 * written to on-chain storage, never held by StillHere infrastructure.
 * The on-chain contract already stores only ``keccak256(chat_sample)``;
 * this layer adds a *deniable* offline copy of the plaintext that the
 * requester can hand to a specific reviewer without revealing it to
 * anyone else.
 *
 * Wire format for a v1 envelope (JSON):
 *   {
 *     "v": 1,
 *     "alg": "AES-256-GCM+ECDH-P256-HKDF-SHA256",
 *     "epk": "<base64url of the ephemeral P-256 public key raw bytes>",
 *     "iv":  "<base64url of the 12-byte GCM nonce>",
 *     "ct":  "<base64url of the ciphertext || tag>",
 *     "profile_hash": "0x…",       // audit-log link back to the case
 *     "created_at": <unix ts>,
 *     "recipient_fingerprint": "<sha256 of the recipient public key>"
 *   }
 *
 * The recipient private key never leaves their device. The sender
 * generates a fresh ephemeral P-256 keypair per envelope so no two
 * envelopes derive the same shared secret. HKDF-SHA-256 stretches the
 * shared secret into a 256-bit AES-GCM key; the 12-byte GCM nonce is
 * random per envelope.
 *
 * Not intended as a full messaging protocol — no ratcheting, no PFS
 * beyond the ephemeral, no signature over the envelope. It is a
 * one-shot "hand this file to the intended reviewer" primitive.
 */

const subtle = (typeof crypto !== 'undefined' ? (crypto.subtle as SubtleCrypto | undefined) : undefined);

export function isEncryptionAvailable(): boolean {
  return typeof subtle !== 'undefined' && subtle !== null;
}

export interface EncryptionKeypair {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  publicKeyB64: string;
  fingerprint: string;
}

export const ENVELOPE_ALG = 'AES-256-GCM+ECDH-P256-HKDF-SHA256' as const;

export interface EncryptedEnvelope {
  v: 1;
  alg: typeof ENVELOPE_ALG;
  epk: string;
  iv: string;
  ct: string;
  profile_hash: string;
  created_at: number;
  recipient_fingerprint: string;
}

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i += 1) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '===='.slice(s.length % 4);
  const norm = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  if (!subtle) throw new Error('WebCrypto unavailable');
  const dig = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(dig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateKeypair(): Promise<EncryptionKeypair> {
  if (!subtle) throw new Error('WebCrypto unavailable — encryption features disabled.');
  const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
  const publicKeyJwk = await subtle.exportKey('jwk', pair.publicKey);
  const privateKeyJwk = await subtle.exportKey('jwk', pair.privateKey);
  const publicKeyRaw = await subtle.exportKey('raw', pair.publicKey);
  const publicKeyB64 = b64urlEncode(publicKeyRaw);
  const fingerprint = (await sha256Hex(publicKeyRaw)).slice(0, 16);
  return { publicKeyJwk, privateKeyJwk, publicKeyB64, fingerprint };
}

async function deriveKey(privateJwk: JsonWebKey, peerJwk: JsonWebKey): Promise<CryptoKey> {
  if (!subtle) throw new Error('WebCrypto unavailable');
  const priv = await subtle.importKey('jwk', privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const peer = await subtle.importKey('jwk', peerJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = await subtle.deriveBits({ name: 'ECDH', public: peer }, priv, 256);
  const hkdfKey = await subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  return subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode('stillhere-envelope-v1'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptForRecipient({
  plaintext,
  recipientPublicKeyJwk,
  profileHash,
}: {
  plaintext: string;
  recipientPublicKeyJwk: JsonWebKey;
  profileHash: string;
}): Promise<EncryptedEnvelope> {
  if (!subtle) throw new Error('WebCrypto unavailable — encryption features disabled.');
  const ephemeral = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const ephemeralPubJwk = await subtle.exportKey('jwk', ephemeral.publicKey);
  const ephemeralPubRaw = await subtle.exportKey('raw', ephemeral.publicKey);
  const ephemeralPrivJwk = await subtle.exportKey('jwk', ephemeral.privateKey);
  const key = await deriveKey(ephemeralPrivJwk, recipientPublicKeyJwk);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  const recipientRaw: ArrayBuffer | null = recipientPublicKeyJwk.x ? await recipientPublicKeyImportRaw(recipientPublicKeyJwk) : null;
  const fingerprint = recipientRaw && recipientRaw.byteLength ? (await sha256Hex(recipientRaw)).slice(0, 16) : 'unknown';
  return {
    v: 1,
    alg: ENVELOPE_ALG,
    epk: b64urlEncode(ephemeralPubRaw),
    iv: b64urlEncode(iv),
    ct: b64urlEncode(ct),
    profile_hash: profileHash,
    created_at: Math.floor(Date.now() / 1000),
    recipient_fingerprint: fingerprint,
  };
  // NB: `ephemeralPubJwk` is currently unused (we only need the raw form on
  // the wire), but exporting both catches subtle jwk-vs-raw drift early.
}

async function recipientPublicKeyImportRaw(jwk: JsonWebKey): Promise<ArrayBuffer> {
  if (!subtle) throw new Error('WebCrypto unavailable');
  const pk = await subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  return subtle.exportKey('raw', pk);
}

export async function decryptEnvelope({
  envelope,
  recipientPrivateKeyJwk,
}: {
  envelope: EncryptedEnvelope;
  recipientPrivateKeyJwk: JsonWebKey;
}): Promise<string> {
  if (!subtle) throw new Error('WebCrypto unavailable — encryption features disabled.');
  if (envelope.v !== 1) throw new Error(`Unsupported envelope version: ${envelope.v}`);
  const epkRaw = b64urlDecode(envelope.epk).buffer.slice(0) as ArrayBuffer;
  const epk = await subtle.importKey('raw', epkRaw, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  const epkJwk = await subtle.exportKey('jwk', epk);
  const key = await deriveKey(recipientPrivateKeyJwk, epkJwk);
  const iv = b64urlDecode(envelope.iv).buffer.slice(0) as ArrayBuffer;
  const ct = b64urlDecode(envelope.ct).buffer.slice(0) as ArrayBuffer;
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/**
 * Content-addressable blob hash. Returned as a lower-case hex string of
 * the raw SHA-256 digest of the JSON-encoded envelope. Suitable for
 * external pinning (Web3.Storage, Pinata, self-hosted IPFS) — the same
 * canonicalisation used here matches what any downstream verifier will
 * see after uploading the envelope file.
 */
export async function envelopeContentHash(envelope: EncryptedEnvelope): Promise<string> {
  const canonical = JSON.stringify(envelope, Object.keys(envelope).sort());
  return sha256Hex(new TextEncoder().encode(canonical).buffer);
}

const KEYPAIR_STORAGE_KEY = 'stillhere:encryption:kp:v1';

interface StoredKeypair {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  fingerprint: string;
}

export function readStoredKeypair(): StoredKeypair | null {
  try {
    const raw = window.localStorage.getItem(KEYPAIR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.publicKeyJwk && parsed.privateKeyJwk) return parsed as StoredKeypair;
    return null;
  } catch {
    return null;
  }
}

export function persistKeypair(kp: EncryptionKeypair): void {
  try {
    const payload: StoredKeypair = {
      publicKeyJwk: kp.publicKeyJwk,
      privateKeyJwk: kp.privateKeyJwk,
      fingerprint: kp.fingerprint,
    };
    window.localStorage.setItem(KEYPAIR_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* localStorage disabled - transient keys only */
  }
}

export function clearStoredKeypair(): void {
  try {
    window.localStorage.removeItem(KEYPAIR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function envelopeAsJson(envelope: EncryptedEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

export function parseEnvelopeJson(raw: string): EncryptedEnvelope {
  const p = JSON.parse(raw);
  if (!p || typeof p !== 'object') throw new Error('envelope is not an object');
  if (p.v !== 1) throw new Error('unsupported envelope version');
  const req = ['alg', 'epk', 'iv', 'ct', 'profile_hash', 'created_at', 'recipient_fingerprint'];
  for (const k of req) {
    if (!(k in p)) throw new Error(`envelope missing required field: ${k}`);
  }
  return p as EncryptedEnvelope;
}
