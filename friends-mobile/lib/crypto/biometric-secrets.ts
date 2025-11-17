import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

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
      return 'Fingerprint';
    case 'facial':
      return 'Face ID';
    case 'iris':
      return 'Iris Scan';
    default:
      return 'Device PIN';
  }
}

/**
 * Authenticate user with biometric or device PIN
 */
export async function authenticateUser(
  promptMessage: string = 'Authenticate to access secrets'
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
        error: 'No biometric data enrolled. Please set up fingerprint or face recognition in device settings.',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Device PIN',
      cancelLabel: 'Cancel',
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
    const key = Array.from(keyBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

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
 * Simple XOR-based encryption (for demo - use AES in production)
 * This provides basic protection; for stronger security, use react-native-aes-crypto
 */
export async function encryptContent(content: string, key: string): Promise<string> {
  // Convert to bytes
  const contentBytes = new TextEncoder().encode(content);
  const keyBytes = hexToBytes(key);

  // XOR encryption (expandable key)
  const encrypted = new Uint8Array(contentBytes.length);
  for (let i = 0; i < contentBytes.length; i++) {
    encrypted[i] = contentBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  // Return as base64 - convert Uint8Array to string without spread operator
  let binaryString = '';
  for (let i = 0; i < encrypted.length; i++) {
    binaryString += String.fromCharCode(encrypted[i]);
  }
  return btoa(binaryString);
}

/**
 * Decrypt content
 */
export async function decryptContent(encryptedBase64: string, key: string): Promise<string> {
  // Decode base64
  const encrypted = new Uint8Array(
    atob(encryptedBase64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
  const keyBytes = hexToBytes(key);

  // XOR decryption (same as encryption)
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }

  return new TextDecoder().decode(decrypted);
}

/**
 * Convert hex string to bytes
 */
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
    return initialized === 'true';
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

const PASSWORD_HASH_ALIAS = 'secrets_password_hash';

/**
 * Derive encryption key from password using simple hash
 * WARNING: This is a simplified implementation. For production, use PBKDF2 or Argon2.
 */
export async function deriveKeyFromPassword(password: string): Promise<string> {
  // Hash password multiple times for basic key stretching
  let hash = password;
  for (let i = 0; i < 1000; i++) {
    const hashBytes = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash);
    hash = hashBytes;
  }
  return hash;
}

/**
 * Initialize encryption with password (for devices without biometrics)
 */
export async function initializeWithPassword(password: string): Promise<boolean> {
  try {
    // Generate encryption key
    const keyBytes = await Crypto.getRandomBytesAsync(32);
    const key = Array.from(keyBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Hash password for verification
    const passwordHash = await deriveKeyFromPassword(password);

    // Encrypt the key with password-derived key
    const encryptedKey = await encryptContent(key, passwordHash);

    // Store encrypted key and password hash
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, encryptedKey);
    await SecureStore.setItemAsync(PASSWORD_HASH_ALIAS, passwordHash);
    await SecureStore.setItemAsync(KEY_CHECK_ALIAS, 'password');

    return true;
  } catch (error) {
    console.error('Failed to initialize with password:', error);
    return false;
  }
}

/**
 * Verify password and get encryption key
 */
export async function getEncryptionKeyWithPassword(password: string): Promise<string | null> {
  try {
    const storedHash = await SecureStore.getItemAsync(PASSWORD_HASH_ALIAS);
    const encryptedKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);

    if (!storedHash || !encryptedKey) {
      throw new Error('Password-based encryption not initialized');
    }

    // Verify password
    const passwordHash = await deriveKeyFromPassword(password);
    if (passwordHash !== storedHash) {
      throw new Error('Invalid password');
    }

    // Decrypt the encryption key
    const key = await decryptContent(encryptedKey, passwordHash);
    return key;
  } catch (error) {
    console.error('Failed to get encryption key with password:', error);
    return null;
  }
}

/**
 * Check if using password-based encryption
 */
export async function isPasswordBasedEncryption(): Promise<boolean> {
  try {
    const keyType = await SecureStore.getItemAsync(KEY_CHECK_ALIAS);
    return keyType === 'password';
  } catch {
    return false;
  }
}

/**
 * Verify if password is correct without returning key
 */
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const storedHash = await SecureStore.getItemAsync(PASSWORD_HASH_ALIAS);
    if (!storedHash) return false;

    const passwordHash = await deriveKeyFromPassword(password);
    return passwordHash === storedHash;
  } catch {
    return false;
  }
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
