import { isSessionUnlocked, lockSession, requireSessionKey, unlockSession } from '../biometric-secrets';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: async () => true,
  isEnrolledAsync: async () => true,
  supportedAuthenticationTypesAsync: async () => [1],
  authenticateAsync: jest.fn(async () => ({ success: true })),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => (k === 'secrets_key_initialized' ? 'true' : 'ab'.repeat(32)),
}));
jest.mock('expo-crypto', () => ({}));

describe('secrets session', () => {
  afterEach(lockSession);

  it('is locked by default and requireSessionKey throws', () => {
    expect(isSessionUnlocked()).toBe(false);
    expect(() => requireSessionKey()).toThrow('SECRETS_LOCKED');
  });

  it('unlock once, key available until locked', async () => {
    expect(await unlockSession()).toBe(true);
    expect(requireSessionKey()).toBe('ab'.repeat(32));
    lockSession();
    expect(() => requireSessionKey()).toThrow('SECRETS_LOCKED');
  });

  it('failed auth leaves it locked', async () => {
    const LA = jest.requireMock('expo-local-authentication');
    LA.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    expect(await unlockSession()).toBe(false);
    expect(isSessionUnlocked()).toBe(false);
  });
});
