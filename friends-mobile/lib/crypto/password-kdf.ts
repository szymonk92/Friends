import { argon2idAsync } from '@noble/hashes/argon2.js';
import { NONCE_BYTES, open, seal } from './aead';

/**
 * Password mode: a random data key is wrapped (XChaCha20-Poly1305) with a key derived from the
 * password via Argon2id + random salt. There is no password hash or verifier stored: a wrong
 * password simply fails to authenticate the wrapped key. KDF params live in the record so they
 * can be raised later without breaking existing setups.
 */
export interface PasswordRecord {
  v: 3;
  kdf: 'argon2id';
  m: number; // memory, KiB
  t: number; // iterations
  p: number; // parallelism
  salt: string; // base64
  wrapped: string; // seal(dataKeyBytes) — `v2:` format
}

// OWASP Argon2id minimum (19 MiB, t=2, p=1). ponytail: raise m/t if unlock feels instant on device.
export const DEFAULT_KDF = { m: 19456, t: 2, p: 1 } as const;
export const SALT_BYTES = 16;

const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

const derive = (password: string, salt: Uint8Array, p: { m: number; t: number; p: number }) =>
  argon2idAsync(password.normalize('NFKC'), salt, { ...p, dkLen: 32 });

/** Wrap a hex data key under a password. `salt`/`nonce` are injected so callers use secure randomness. */
export async function wrapDataKey(
  password: string,
  dataKeyHex: string,
  salt: Uint8Array,
  nonce: Uint8Array,
  params: { m: number; t: number; p: number } = DEFAULT_KDF
): Promise<PasswordRecord> {
  const kek = await derive(password, salt, params);
  const wrapped = seal(toHex(fromHex(dataKeyHex)), kek, nonce);
  return { v: 3, kdf: 'argon2id', ...params, salt: toB64(salt), wrapped };
}

/** Returns the hex data key, or null on a wrong password / tampered record. */
export async function unwrapDataKey(password: string, rec: PasswordRecord): Promise<string | null> {
  try {
    const kek = await derive(password, fromB64(rec.salt), rec);
    return open(rec.wrapped, kek);
  } catch {
    return null;
  }
}

export function parsePasswordRecord(raw: string | null): PasswordRecord | null {
  if (!raw || !raw.startsWith('{')) return null; // legacy (pre-#13) records are ignored
  try {
    const r = JSON.parse(raw) as PasswordRecord;
    return r.v === 3 && r.kdf === 'argon2id' ? r : null;
  } catch {
    return null;
  }
}

export { NONCE_BYTES };
