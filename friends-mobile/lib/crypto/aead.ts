import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';

/** Version tag for authenticated ciphertexts; anything without it is the legacy XOR format. */
export const SEALED_PREFIX = 'v2:';
export const NONCE_BYTES = 24;

const toB64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** XChaCha20-Poly1305 with a fresh random nonce per message: `v2:` + base64(nonce ‖ ciphertext+tag). */
export function seal(plain: string, key: Uint8Array, nonce: Uint8Array): string {
  if (key.length !== 32) throw new Error('Encryption key must be 32 bytes');
  if (nonce.length !== NONCE_BYTES) throw new Error('Nonce must be 24 bytes');
  const ct = xchacha20poly1305(key, nonce).encrypt(new TextEncoder().encode(plain));
  const out = new Uint8Array(nonce.length + ct.length);
  out.set(nonce);
  out.set(ct, nonce.length);
  return SEALED_PREFIX + toB64(out);
}

/** Inverse of seal; throws if the key is wrong or the ciphertext was tampered with. */
export function open(sealed: string, key: Uint8Array): string {
  const raw = fromB64(sealed.slice(SEALED_PREFIX.length));
  const nonce = raw.subarray(0, NONCE_BYTES);
  const pt = xchacha20poly1305(key, nonce).decrypt(raw.subarray(NONCE_BYTES));
  return new TextDecoder().decode(pt);
}
