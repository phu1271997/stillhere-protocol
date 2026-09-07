/**
 * Phase 4 — Envelope encryption roundtrip smoke.
 *
 * Runs under Node 20 which exposes `globalThis.crypto` + `crypto.subtle`
 * with WebCrypto semantics identical to the browser. This is deliberately
 * a plain `node --test` file, not a Vitest / Jest module — no runtime
 * dependency, no config, so `make fast` can shell out to it directly.
 *
 * Run:
 *   node --test frontend/src/lib/encryption.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsNode = require('typescript');

async function importTsModule(path) {
  const fs = await import('node:fs/promises');
  const url = new URL(path, import.meta.url);
  const src = await fs.readFile(url, 'utf8');
  const out = tsNode.transpileModule(src, {
    compilerOptions: { module: 'ES2022', target: 'ES2022', jsx: 'preserve', esModuleInterop: true },
  }).outputText;
  const b64 = Buffer.from(out).toString('base64');
  return await import(`data:text/javascript;base64,${b64}`);
}

test('envelope encrypts and decrypts round-trip', async () => {
  const enc = await importTsModule('./encryption.ts');
  assert.ok(enc.isEncryptionAvailable());

  const recipient = await enc.generateKeypair();
  const envelope = await enc.encryptForRecipient({
    plaintext: 'hello, romance-scam jury',
    recipientPublicKeyJwk: recipient.publicKeyJwk,
    profileHash: '0xabc123',
  });

  assert.equal(envelope.v, 1);
  assert.equal(envelope.alg, 'AES-256-GCM+ECDH-P256-HKDF-SHA256');
  assert.ok(envelope.iv.length > 0);
  assert.ok(envelope.ct.length > 0);
  assert.ok(envelope.epk.length > 0);
  assert.equal(envelope.profile_hash, '0xabc123');
  assert.ok(envelope.recipient_fingerprint && envelope.recipient_fingerprint !== 'unknown');

  const roundTrip = await enc.decryptEnvelope({
    envelope,
    recipientPrivateKeyJwk: recipient.privateKeyJwk,
  });
  assert.equal(roundTrip, 'hello, romance-scam jury');
});

test('decrypt with a wrong keypair fails', async () => {
  const enc = await importTsModule('./encryption.ts');
  const recipient = await enc.generateKeypair();
  const wrong = await enc.generateKeypair();
  const envelope = await enc.encryptForRecipient({
    plaintext: 'secret',
    recipientPublicKeyJwk: recipient.publicKeyJwk,
    profileHash: '0x0',
  });
  await assert.rejects(() =>
    enc.decryptEnvelope({ envelope, recipientPrivateKeyJwk: wrong.privateKeyJwk })
  );
});

test('envelope content hash is deterministic across canonical serialisation', async () => {
  const enc = await importTsModule('./encryption.ts');
  const recipient = await enc.generateKeypair();
  const envelope = await enc.encryptForRecipient({
    plaintext: 'plaintext',
    recipientPublicKeyJwk: recipient.publicKeyJwk,
    profileHash: '0xdead',
  });
  const h1 = await enc.envelopeContentHash(envelope);
  const h2 = await enc.envelopeContentHash({ ...envelope });
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

test('parseEnvelopeJson rejects malformed input', async () => {
  const enc = await importTsModule('./encryption.ts');
  assert.throws(() => enc.parseEnvelopeJson('not-json'));
  assert.throws(() => enc.parseEnvelopeJson('{}'));
  assert.throws(() => enc.parseEnvelopeJson(JSON.stringify({ v: 2 })));
});

test('parseEnvelopeJson accepts a well-formed envelope', async () => {
  const enc = await importTsModule('./encryption.ts');
  const recipient = await enc.generateKeypair();
  const envelope = await enc.encryptForRecipient({
    plaintext: 'ok',
    recipientPublicKeyJwk: recipient.publicKeyJwk,
    profileHash: '0x1',
  });
  const roundTrip = enc.parseEnvelopeJson(enc.envelopeAsJson(envelope));
  assert.equal(roundTrip.v, 1);
  assert.equal(roundTrip.recipient_fingerprint, envelope.recipient_fingerprint);
});
