import { randomBytes } from 'crypto';
import { open, seal, SEALED_PREFIX } from '../aead';

const key = new Uint8Array(randomBytes(32));
const nonce = () => new Uint8Array(randomBytes(24));

describe('aead seal/open', () => {
  it('round-trips unicode text', () => {
    const msg = 'Hasło do skrytki: zażółć gęślą jaźń 🔐';
    const sealed = seal(msg, key, nonce());
    expect(sealed.startsWith(SEALED_PREFIX)).toBe(true);
    expect(open(sealed, key)).toBe(msg);
  });

  it('same plaintext encrypts differently each time (random nonce)', () => {
    expect(seal('same', key, nonce())).not.toBe(seal('same', key, nonce()));
  });

  it('rejects a wrong key and tampered ciphertext', () => {
    const sealed = seal('secret', key, nonce());
    expect(() => open(sealed, new Uint8Array(randomBytes(32)))).toThrow();
    const b = Buffer.from(sealed.slice(3), 'base64');
    b[b.length - 1] ^= 1;
    expect(() => open(SEALED_PREFIX + b.toString('base64'), key)).toThrow();
  });
});
