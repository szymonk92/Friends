import { parsePasswordRecord, unwrapDataKey, wrapDataKey } from '../password-kdf';

const FAST = { m: 8, t: 1, p: 1 }; // tiny params: tests exercise logic, not hardness
const key = 'ab'.repeat(32);
const salt = new Uint8Array(16).fill(1);
const nonce = new Uint8Array(24).fill(2);

describe('password-kdf', () => {
  it('round-trips the data key with the right password', async () => {
    const rec = await wrapDataKey('correct horse', key, salt, nonce, FAST);
    expect(await unwrapDataKey('correct horse', rec)).toBe(key);
  });

  it('rejects a wrong password and a tampered record', async () => {
    const rec = await wrapDataKey('correct horse', key, salt, nonce, FAST);
    expect(await unwrapDataKey('wrong', rec)).toBeNull();
    expect(await unwrapDataKey('correct horse', { ...rec, wrapped: rec.wrapped.slice(0, -4) + 'AAAA' })).toBeNull();
  });

  it('uses the salt (same password, different salt → different record)', async () => {
    const a = await wrapDataKey('pw', key, salt, nonce, FAST);
    const b = await wrapDataKey('pw', key, new Uint8Array(16).fill(9), nonce, FAST);
    expect(a.wrapped).not.toBe(b.wrapped);
  });

  it('ignores legacy / garbage records', () => {
    expect(parsePasswordRecord('deadbeef')).toBeNull();
    expect(parsePasswordRecord(null)).toBeNull();
    expect(parsePasswordRecord('{"v":2}')).toBeNull();
  });
});
