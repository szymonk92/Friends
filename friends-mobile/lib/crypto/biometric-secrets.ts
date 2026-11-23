import { tr } from '@/lib/i18n/labels';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { NONCE_BYTES, open, seal, SEALED_PREFIX } from './aead';
import { SALT_BYTES, parsePasswordRecord, unwrapDataKey, wrapDataKey } from './password-kdf';

/**
 * Biometric-First Secrets Protection
 *
 * Priority:
 * 1. Biometric (Fingerprint/Face ID) - Most convenient
 * 2. Device PIN/Pattern - Fallback
 * 3. Error handling for unsupported devices
 */

export interface BiometricStatus {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
}

export interface AuthenticationResult {
  success: boolean;
  error?: string;
  warning?: string;
}

const ENCRYPTION_KEY_ALIAS = 'secrets_encryption_key';
const KEY_CHECK_ALIAS = 'secrets_key_initialized';
const PASSWORD_HASH_ALIAS = 'secrets_password_hash'; // legacy, only deleted

/**
 * Check biometric availability on device
 */
export async function checkBiometricStatus(): Promise<BiometricStatus> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    // Determine primary biometric type
    let biometricType: 'fingerprint' | 'facial' | 'iris' | 'none' = 'none';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    return {
      isAvailable: hasHardware,
      isEnrolled: hasHardware && isEnrolled,
      supportedTypes,
      biometricType,
    };
  } catch (error) {
    console.error('Failed to check biometric status:', error);
    return {
      isAvailable: false,
      isEnrolled: false,
      supportedTypes: [],
      biometricType: 'none',
    };
  }
}

/**
 * Get human-readable biometric type name
 */
export function getBiometricTypeName(type: 'fingerprint' | 'facial' | 'iris' | 'none'): string {
  switch (type) {
    case 'fingerprint':
      return tr('secrets.fingerprint', 'Fingerprint');
    case 'facial':
      return tr('secrets.faceId', 'Face ID');
    case 'iris':
      return tr('secrets.iris', 'Iris Scan');
    default:
      return tr('secrets.devicePin', 'Device PIN');
  }
}

/**
 * Authenticate user with biometric or device PIN
 */
export async function authenticateUser(
  promptMessage: string = tr('secrets.authenticate', 'Authenticate to access secrets')
): Promise<AuthenticationResult> {
  try {
    const status = await checkBiometricStatus();

    if (!status.isAvailable) {
      return {
        success: false,
        error: 'Biometric hardware not available on this device',
      };
    }

    if (!status.isEnrolled) {
      return {
        success: false,
        error:
          'No biometric data enrolled. Please set up fingerprint or face recognition in device settings.',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: tr('secrets.usePin', 'Use Device PIN'),
      cancelLabel: tr('common.cancel', 'Cancel'),
      disableDeviceFallback: false, // Allow device PIN as fallback
    });

    if (result.success) {
      return { success: true };
    } else {
      let error = 'Authentication failed';
      if (result.error === 'user_cancel') {
        error = 'Authentication cancelled';
      } else if (result.error === 'user_fallback') {
        error = 'User chose to use device PIN';
      } else if (result.error === 'lockout') {
        error = 'Too many failed attempts. Try again later.';
      }
      return { success: false, error };
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown authentication error',
    };
  }
}

/**
 * Initialize encryption key (run once on first setup)
 * Key is stored in Secure Enclave (iOS) / Android Keystore
 */
export async function initializeEncryptionKey(): Promise<boolean> {
  try {
    // Check if key already exists
    const existing = await SecureStore.getItemAsync(KEY_CHECK_ALIAS);
    if (existing) {
      return true; // Already initialized
    }

    // Generate a random 256-bit encryption key
    const keyBytes = await Crypto.getRandomBytesAsync(32);
    const key = toHex(keyBytes);

    // Store key in Secure Store (protected by device security)
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key, {
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });

    // Mark as initialized
    await SecureStore.setItemAsync(KEY_CHECK_ALIAS, 'true', {
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize encryption key:', error);
    return false;
  }
}

/**
 * Get encryption key after biometric authentication
 */
export async function getEncryptionKey(): Promise<string | null> {
  try {
    const authResult = await authenticateUser('Authenticate to access your secrets');

    if (!authResult.success) {
      throw new Error(authResult.error || 'Authentication failed');
    }

    const key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
    return key;
  } catch (error) {
    console.error('Failed to get encryption key:', error);
    return null;
  }
}

/**
 * Encrypts with XChaCha20-Poly1305 and a random nonce per secret (`v2:` format).
 */
export async function encryptContent(content: string, key: string): Promise<string> {
  const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
  return seal(content, hexToBytes(key), nonce);
}

/**
 * Decrypts `v2:` (authenticated) content. The pre-#13 repeating-key XOR format is no longer
 * supported (dropped deliberately; those secrets are unreadable).
 */
export async function decryptContent(encrypted: string, key: string): Promise<string> {
  if (!encrypted.startsWith(SEALED_PREFIX)) throw new Error('UNSUPPORTED_SECRET_FORMAT');
  return open(encrypted, hexToBytes(key));
}

/**
 * Convert hex string to bytes
 */
const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Check if secrets are set up
 */
export async function isSecretsSetup(): Promise<boolean> {
  try {
    const initialized = await SecureStore.getItemAsync(KEY_CHECK_ALIAS);
    // Biometric ('true') or password mode; a pre-#13 password setup counts as not set up.
    return initialized === 'true' || (initialized === 'password' && (await isPasswordBasedEncryption()));
  } catch {
    return false;
  }
}

/**
 * Reset secrets (delete encryption key - WARNING: all secrets become unreadable!)
 */
export async function resetSecretsEncryption(): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_ALIAS);
    await SecureStore.deleteItemAsync(KEY_CHECK_ALIAS);
    await SecureStore.deleteItemAsync(PASSWORD_HASH_ALIAS);
    return true;
  } catch (error) {
    console.error('Failed to reset secrets encryption:', error);
    return false;
  }
}

// ========== PASSWORD-BASED FALLBACK ==========

/** The password record (Argon2id salt/params + wrapped data key) lives under ENCRYPTION_KEY_ALIAS. */
async function readPasswordRecord() {
  const mode = await SecureStore.getItemAsync(KEY_CHECK_ALIAS);
  if (mode !== 'password') return null;
  return parsePasswordRecord(await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS));
}

/**
 * Initialize encryption with a password (for devices without biometrics).
 * Overwrites any previous setup, including pre-#13 password setups.
 */
export async function initializeWithPassword(password: string): Promise<boolean> {
  try {
    const dataKey = toHex(await Crypto.getRandomBytesAsync(32));
    const record = await wrapDataKey(
      password,
      dataKey,
      await Crypto.getRandomBytesAsync(SALT_BYTES),
      await Crypto.getRandomBytesAsync(NONCE_BYTES)
    );
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, JSON.stringify(record));
    await SecureStore.deleteItemAsync(PASSWORD_HASH_ALIAS); // legacy unsalted hash, if any
    await SecureStore.setItemAsync(KEY_CHECK_ALIAS, 'password');
    return true;
  } catch (error) {
    console.error('Failed to initialize with password:', error);
    return false;
  }
}

/** Unlock with the password; null if wrong or not set up. */
export async function getEncryptionKeyWithPassword(password: string): Promise<string | null> {
  const record = await readPasswordRecord();
  return record ? unwrapDataKey(password, record) : null;
}

/**
 * Check if using password-based encryption
 */
export async function isPasswordBasedEncryption(): Promise<boolean> {
  return (await readPasswordRecord()) !== null;
}

/**
 * Verify if password is correct without returning key
 */
export async function verifyPassword(password: string): Promise<boolean> {
  return (await getEncryptionKeyWithPassword(password)) !== null;
}

/**
 * Get encryption key - automatically handles both biometric and password modes
 * For password mode, password parameter is required
 */
export async function getEncryptionKeyUnified(password?: string): Promise<string | null> {
  const isPasswordMode = await isPasswordBasedEncryption();

  if (isPasswordMode) {
    if (!password) {
      throw new Error('PASSWORD_REQUIRED');
    }
    return getEncryptionKeyWithPassword(password);
  } else {
    return getEncryptionKey();
  }
}

// ========== SESSION (unlock once, keep the data key in memory only) ==========

let sessionKey: string | null = null;

export const isSessionUnlocked = () => sessionKey !== null;

/** Drop the in-memory key (leaving the Secrets screen, app to background). */
export function lockSession(): void {
  sessionKey = null;
}

/** Unlock once (biometric prompt or password); false if cancelled / wrong password. */
export async function unlockSession(password?: string): Promise<boolean> {
  try {
    sessionKey = await getEncryptionKeyUnified(password);
  } catch {
    sessionKey = null;
  }
  return sessionKey !== null;
}

/** Key for create/view; throws `SECRETS_LOCKED` if the screen wasn't unlocked. */
export function requireSessionKey(): string {
  if (!sessionKey) throw new Error('SECRETS_LOCKED');
  return sessionKey;
}
