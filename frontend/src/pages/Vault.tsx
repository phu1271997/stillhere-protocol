import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Lock, Unlock, RefreshCcw, Download, Upload, AlertCircle, CheckCircle2, Trash2, ClipboardCopy } from 'lucide-react';
import {
  isEncryptionAvailable,
  generateKeypair,
  encryptForRecipient,
  decryptEnvelope,
  envelopeContentHash,
  readStoredKeypair,
  persistKeypair,
  clearStoredKeypair,
  parseEnvelopeJson,
  envelopeAsJson,
  EncryptionKeypair,
  EncryptedEnvelope,
} from '../lib/encryption';

type Panel = 'mine' | 'encrypt' | 'decrypt';

export const Vault: React.FC = () => {
  const available = useMemo(() => isEncryptionAvailable(), []);
  const [panel, setPanel] = useState<Panel>('mine');
  const [kp, setKp] = useState<EncryptionKeypair | null>(null);
  const [storedFingerprint, setStoredFingerprint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const stored = readStoredKeypair();
    if (stored) {
      setKp({
        publicKeyJwk: stored.publicKeyJwk,
        privateKeyJwk: stored.privateKeyJwk,
        publicKeyB64: '',
        fingerprint: stored.fingerprint,
      });
      setStoredFingerprint(stored.fingerprint);
    }
  }, []);

  const handleGenerate = async () => {
    if (!available) return;
    setBusy(true);
    setFlash(null);
    try {
      const fresh = await generateKeypair();
      persistKeypair(fresh);
      setKp(fresh);
      setStoredFingerprint(fresh.fingerprint);
      setFlash({ kind: 'ok', text: 'New keypair generated. Private key is in localStorage on this device only.' });
    } catch (err: any) {
      setFlash({ kind: 'err', text: err?.message || String(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    clearStoredKeypair();
    setKp(null);
    setStoredFingerprint(null);
    setFlash({ kind: 'ok', text: 'Keypair cleared from this device.' });
  };

  if (!available) {
    return (
      <div className="max-w-2xl mx-auto py-10 glass-panel p-6 flex flex-col gap-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-brand-500" /> Envelope Vault
        </h2>
        <p className="text-sm text-slate-300">
          WebCrypto isn't available in this browser. Client-side encryption features require a modern browser with{' '}
          <code className="text-brand-300">crypto.subtle</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 flex flex-col gap-6">
      <div className="glass-panel p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-brand-500" />
          <h2 className="text-xl font-bold text-white">Encrypted Evidence Vault</h2>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Encrypt a chat sample (or any short evidence text) so it can be handed to a specific reviewer without touching
          any server. Uses a per-envelope ephemeral ECDH keypair over P-256, HKDF-SHA-256 for key derivation, and
          AES-256-GCM for the payload. The on-chain contract already stores only{' '}
          <code className="text-brand-300">keccak256(chat_sample)</code>; this page is the offline plaintext channel.
        </p>

        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <PanelTab active={panel === 'mine'} onClick={() => setPanel('mine')} label="My keypair" />
          <PanelTab active={panel === 'encrypt'} onClick={() => setPanel('encrypt')} label="Encrypt to reviewer" />
          <PanelTab active={panel === 'decrypt'} onClick={() => setPanel('decrypt')} label="Decrypt envelope" />
        </div>

        {flash && (
          <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${flash.kind === 'ok' ? 'bg-emerald-950/60 border border-emerald-700/40 text-emerald-200' : 'bg-rose-950/60 border border-rose-700/40 text-rose-200'}`}>
            {flash.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <span>{flash.text}</span>
          </div>
        )}

        {panel === 'mine' && (
          <div className="flex flex-col gap-3">
            {kp ? (
              <div className="flex flex-col gap-2 bg-slate-950/70 rounded-lg border border-slate-800 p-4">
                <span className="text-xs uppercase text-slate-400 tracking-wider">Public key fingerprint</span>
                <code className="font-mono text-sm text-brand-300">{storedFingerprint || kp.fingerprint}</code>
                <div className="flex flex-col gap-1 pt-2 border-t border-slate-800">
                  <span className="text-xs uppercase text-slate-400 tracking-wider">Full public JWK (share with senders)</span>
                  <pre className="text-[10px] text-slate-300 font-mono overflow-x-auto max-h-40 whitespace-pre-wrap">{JSON.stringify(kp.publicKeyJwk, null, 2)}</pre>
                  <CopyButton text={JSON.stringify(kp.publicKeyJwk)} label="Copy public JWK" />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No keypair on this device yet. Generate one to receive envelopes.</p>
            )}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" /> {kp ? 'Rotate keypair' : 'Generate keypair'}
              </button>
              {kp && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 border border-slate-700 text-slate-100 text-sm font-medium inline-flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete from this device
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              The private key is stored in this browser's localStorage. If you clear site data or switch device, it is
              gone forever — export the JWK manually if you need portability.
            </p>
          </div>
        )}

        {panel === 'encrypt' && <EncryptPanel />}

        {panel === 'decrypt' && <DecryptPanel storedPrivateKey={kp?.privateKeyJwk || null} />}
      </div>
    </div>
  );
};

const PanelTab: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${active ? 'bg-brand-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
  >
    {label}
  </button>
);

const EncryptPanel: React.FC = () => {
  const [recipientJwkText, setRecipientJwkText] = useState('');
  const [plaintext, setPlaintext] = useState('');
  const [profileHash, setProfileHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [envelope, setEnvelope] = useState<EncryptedEnvelope | null>(null);
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleEncrypt = async () => {
    setBusy(true);
    setErr(null);
    setEnvelope(null);
    setContentHash(null);
    try {
      if (!plaintext.trim()) throw new Error('Plaintext required.');
      if (!recipientJwkText.trim()) throw new Error('Recipient public JWK required.');
      const parsed = JSON.parse(recipientJwkText);
      if (!parsed || typeof parsed !== 'object' || !parsed.x) throw new Error('Recipient JWK must contain the "x" coordinate.');
      const env = await encryptForRecipient({
        plaintext,
        recipientPublicKeyJwk: parsed as JsonWebKey,
        profileHash: profileHash.trim().toLowerCase() || '0x0',
      });
      const h = await envelopeContentHash(env);
      setEnvelope(env);
      setContentHash(h);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!envelope) return;
    const blob = new Blob([envelopeAsJson(envelope)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stillhere-envelope-${envelope.recipient_fingerprint}-${envelope.created_at}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs uppercase text-slate-400 tracking-wider">Recipient public JWK</label>
      <textarea
        rows={3}
        value={recipientJwkText}
        onChange={e => setRecipientJwkText(e.target.value)}
        placeholder='Paste the reviewer&apos;s public JWK, e.g. {"kty":"EC","crv":"P-256","x":"…","y":"…"}'
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
      />

      <label className="text-xs uppercase text-slate-400 tracking-wider">Plaintext</label>
      <textarea
        rows={4}
        value={plaintext}
        onChange={e => setPlaintext(e.target.value)}
        placeholder="Anonymized chat sample or any short evidence text (max 5000 chars)"
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
      />

      <label className="text-xs uppercase text-slate-400 tracking-wider">Case profile_hash (optional)</label>
      <input
        type="text"
        value={profileHash}
        onChange={e => setProfileHash(e.target.value)}
        placeholder="0x…"
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-100"
      />

      <div className="flex gap-2">
        <button
          onClick={handleEncrypt}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Lock className="w-4 h-4" /> {busy ? 'Encrypting…' : 'Encrypt envelope'}
        </button>
      </div>

      {err && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-700/40 text-xs text-rose-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {err}
        </div>
      )}

      {envelope && (
        <div className="flex flex-col gap-2 bg-slate-950/70 rounded-lg border border-brand-600/30 p-4">
          <span className="text-xs uppercase tracking-wider text-slate-400">Encrypted envelope</span>
          <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto max-h-52 whitespace-pre-wrap">{envelopeAsJson(envelope)}</pre>
          <div className="flex flex-col gap-1 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Content hash (SHA-256, canonical) — suitable for pinning to IPFS / Web3.Storage / any content-addressable store:</span>
            <code className="text-[11px] text-brand-300 font-mono break-all">{contentHash}</code>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Download JSON
            </button>
            <CopyButton text={envelopeAsJson(envelope)} label="Copy envelope" />
          </div>
        </div>
      )}
    </div>
  );
};

const DecryptPanel: React.FC<{ storedPrivateKey: JsonWebKey | null }> = ({ storedPrivateKey }) => {
  const [envelopeText, setEnvelopeText] = useState('');
  const [privJwkText, setPrivJwkText] = useState(storedPrivateKey ? JSON.stringify(storedPrivateKey) : '');
  const [busy, setBusy] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (storedPrivateKey && !privJwkText) setPrivJwkText(JSON.stringify(storedPrivateKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedPrivateKey]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const txt = await f.text();
    setEnvelopeText(txt);
  };

  const handleDecrypt = async () => {
    setBusy(true);
    setErr(null);
    setPlaintext(null);
    try {
      const env = parseEnvelopeJson(envelopeText);
      const priv = JSON.parse(privJwkText);
      const pt = await decryptEnvelope({ envelope: env, recipientPrivateKeyJwk: priv as JsonWebKey });
      setPlaintext(pt);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs uppercase text-slate-400 tracking-wider">Envelope JSON</label>
      <textarea
        rows={5}
        value={envelopeText}
        onChange={e => setEnvelopeText(e.target.value)}
        placeholder="Paste an envelope JSON, or upload the file below"
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
      />
      <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
        <Upload className="w-4 h-4 text-brand-400" /> Upload envelope file
        <input type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
      </label>

      <label className="text-xs uppercase text-slate-400 tracking-wider">Recipient private JWK</label>
      <textarea
        rows={3}
        value={privJwkText}
        onChange={e => setPrivJwkText(e.target.value)}
        placeholder="Paste your private JWK (or use the one stored on this device)"
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
      />
      {storedPrivateKey && (
        <button
          onClick={() => setPrivJwkText(JSON.stringify(storedPrivateKey))}
          className="self-start text-[11px] text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
        >
          <RefreshCcw className="w-3 h-3" /> Refill from stored keypair
        </button>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleDecrypt}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Unlock className="w-4 h-4" /> {busy ? 'Decrypting…' : 'Decrypt'}
        </button>
      </div>

      {err && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-700/40 text-xs text-rose-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {err}
        </div>
      )}

      {plaintext !== null && (
        <div className="flex flex-col gap-2 bg-slate-950/70 rounded-lg border border-brand-600/30 p-4">
          <span className="text-xs uppercase tracking-wider text-slate-400">Decrypted plaintext</span>
          <pre className="text-sm text-slate-100 whitespace-pre-wrap font-sans">{plaintext}</pre>
          <CopyButton text={plaintext} label="Copy plaintext" />
        </div>
      )}
    </div>
  );
};

const CopyButton: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [ok, setOk] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={handle}
      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1 self-start"
    >
      <ClipboardCopy className="w-3.5 h-3.5" /> {ok ? 'Copied ✓' : label}
    </button>
  );
};
