/**
 * Cryptography Module
 *
 * Provides encryption utilities for sensitive data in the Friends app.
 */

export {
  encryptSecret,
  decryptSecret,
  verifyPassword,
  changePassword,
  generateSalt,
  EncryptionError,
  type EncryptionResult,
} from './encryption';
