/**
 * Encryption Module Tests
 *
 * Tests for the encryption utilities including:
 * - Basic encryption/decryption
 * - Password validation
 * - Error handling
 * - Password change functionality
 */

import {
  encryptSecret,
  decryptSecret,
  verifyPassword,
  changePassword,
  generateSalt,
  EncryptionError,
} from '../encryption';

describe('Encryption Module', () => {
  describe('generateSalt', () => {
    it('should generate a base64 encoded salt', async () => {
      const salt = await generateSalt();

      expect(salt).toBeDefined();
      expect(typeof salt).toBe('string');
      expect(salt.length).toBeGreaterThan(0);
    });

    it('should generate unique salts each time', async () => {
      const salt1 = await generateSalt();
      const salt2 = await generateSalt();

      expect(salt1).not.toBe(salt2);
    });
  });

  describe('encryptSecret', () => {
    it('should encrypt plaintext and return encrypted content with salt', async () => {
      const plaintext = 'This is a secret message';
      const password = 'securePassword123';

      const result = await encryptSecret(plaintext, password);

      expect(result.encryptedContent).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.encryptedContent).not.toBe(plaintext);
    });

    it('should produce different encrypted content for same plaintext with different passwords', async () => {
      const plaintext = 'Same message';
      const password1 = 'password123';
      const password2 = 'differentPassword456';

      const result1 = await encryptSecret(plaintext, password1);
      const result2 = await encryptSecret(plaintext, password2);

      expect(result1.encryptedContent).not.toBe(result2.encryptedContent);
    });

    it('should produce different encrypted content each time due to random salt/IV', async () => {
      const plaintext = 'Same message';
      const password = 'samePassword';

      const result1 = await encryptSecret(plaintext, password);
      const result2 = await encryptSecret(plaintext, password);

      // Encrypted content should differ due to random salt
      expect(result1.encryptedContent).not.toBe(result2.encryptedContent);
      expect(result1.salt).not.toBe(result2.salt);
    });

    it('should throw error for empty plaintext', async () => {
      await expect(encryptSecret('', 'password123')).rejects.toThrow(EncryptionError);
    });

    it('should throw error for short password', async () => {
      await expect(encryptSecret('secret', 'short')).rejects.toThrow(EncryptionError);
    });

    it('should handle special characters in plaintext', async () => {
      const plaintext = 'Special chars: !@#$%^&*()_+-=[]{}|;:",.<>?/`~';
      const password = 'securePassword123';

      const result = await encryptSecret(plaintext, password);
      expect(result.encryptedContent).toBeDefined();
    });

    it('should handle unicode characters', async () => {
      const plaintext = 'Unicode: 你好世界 🎉 émojis and ñ';
      const password = 'securePassword123';

      const result = await encryptSecret(plaintext, password);
      expect(result.encryptedContent).toBeDefined();
    });

    it('should handle long plaintext', async () => {
      const plaintext = 'A'.repeat(10000);
      const password = 'securePassword123';

      const result = await encryptSecret(plaintext, password);
      expect(result.encryptedContent).toBeDefined();
    });
  });

  describe('decryptSecret', () => {
    it('should decrypt encrypted content back to original plaintext', async () => {
      const plaintext = 'This is a secret message';
      const password = 'securePassword123';

      const encrypted = await encryptSecret(plaintext, password);
      const decrypted = await decryptSecret(encrypted.encryptedContent, encrypted.salt, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt special characters correctly', async () => {
      const plaintext = 'Special: !@#$%^&*()_+-=[]{}|;:",.<>?/`~';
      const password = 'securePassword123';

      const encrypted = await encryptSecret(plaintext, password);
      const decrypted = await decryptSecret(encrypted.encryptedContent, encrypted.salt, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt unicode characters correctly', async () => {
      const plaintext = 'Unicode: 你好世界 🎉 émojis and ñ';
      const password = 'securePassword123';

      const encrypted = await encryptSecret(plaintext, password);
      const decrypted = await decryptSecret(encrypted.encryptedContent, encrypted.salt, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt long content correctly', async () => {
      const plaintext = 'Long content: ' + 'A'.repeat(5000);
      const password = 'securePassword123';

      const encrypted = await encryptSecret(plaintext, password);
      const decrypted = await decryptSecret(encrypted.encryptedContent, encrypted.salt, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error with wrong password', async () => {
      const plaintext = 'Secret message';
      const correctPassword = 'correctPassword123';
      const wrongPassword = 'wrongPassword456';

      const encrypted = await encryptSecret(plaintext, correctPassword);

      await expect(
        decryptSecret(encrypted.encryptedContent, encrypted.salt, wrongPassword)
      ).rejects.toThrow(EncryptionError);
    });

    it('should throw error for empty encrypted content', async () => {
      await expect(decryptSecret('', 'someSalt', 'password123')).rejects.toThrow(EncryptionError);
    });

    it('should throw error for empty salt', async () => {
      await expect(decryptSecret('someContent', '', 'password123')).rejects.toThrow(EncryptionError);
    });

    it('should throw error for empty password', async () => {
      await expect(decryptSecret('someContent', 'someSalt', '')).rejects.toThrow(EncryptionError);
    });

    it('should throw error for corrupted encrypted content', async () => {
      const plaintext = 'Secret message';
      const password = 'password123';

      const encrypted = await encryptSecret(plaintext, password);

      // Corrupt the encrypted content
      const corrupted = encrypted.encryptedContent.slice(0, -5) + 'xxxxx';

      await expect(decryptSecret(corrupted, encrypted.salt, password)).rejects.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const plaintext = 'Secret message';
      const password = 'correctPassword123';

      const encrypted = await encryptSecret(plaintext, password);
      const isValid = await verifyPassword(encrypted.encryptedContent, encrypted.salt, password);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const plaintext = 'Secret message';
      const correctPassword = 'correctPassword123';
      const wrongPassword = 'wrongPassword456';

      const encrypted = await encryptSecret(plaintext, correctPassword);
      const isValid = await verifyPassword(encrypted.encryptedContent, encrypted.salt, wrongPassword);

      expect(isValid).toBe(false);
    });

    it('should return false for corrupted data', async () => {
      const plaintext = 'Secret message';
      const password = 'password123';

      const encrypted = await encryptSecret(plaintext, password);
      const corrupted = encrypted.encryptedContent.slice(0, -10);

      const isValid = await verifyPassword(corrupted, encrypted.salt, password);
      expect(isValid).toBe(false);
    });
  });

  describe('changePassword', () => {
    it('should re-encrypt content with new password', async () => {
      const plaintext = 'Secret message';
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';

      const original = await encryptSecret(plaintext, oldPassword);
      const changed = await changePassword(
        original.encryptedContent,
        original.salt,
        oldPassword,
        newPassword
      );

      // Should be able to decrypt with new password
      const decrypted = await decryptSecret(changed.encryptedContent, changed.salt, newPassword);
      expect(decrypted).toBe(plaintext);
    });

    it('should generate new salt when changing password', async () => {
      const plaintext = 'Secret message';
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';

      const original = await encryptSecret(plaintext, oldPassword);
      const changed = await changePassword(
        original.encryptedContent,
        original.salt,
        oldPassword,
        newPassword
      );

      expect(changed.salt).not.toBe(original.salt);
    });

    it('should fail with wrong old password', async () => {
      const plaintext = 'Secret message';
      const oldPassword = 'oldPassword123';
      const wrongOldPassword = 'wrongPassword';
      const newPassword = 'newPassword456';

      const original = await encryptSecret(plaintext, oldPassword);

      await expect(
        changePassword(original.encryptedContent, original.salt, wrongOldPassword, newPassword)
      ).rejects.toThrow();
    });

    it('should not be able to decrypt with old password after change', async () => {
      const plaintext = 'Secret message';
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';

      const original = await encryptSecret(plaintext, oldPassword);
      const changed = await changePassword(
        original.encryptedContent,
        original.salt,
        oldPassword,
        newPassword
      );

      // Should NOT be able to decrypt new content with old password
      await expect(
        decryptSecret(changed.encryptedContent, changed.salt, oldPassword)
      ).rejects.toThrow();
    });
  });

  describe('Security Properties', () => {
    it('should not leak plaintext in encrypted content', async () => {
      const plaintext = 'SuperSecretPassword123!';
      const password = 'encryptionPassword';

      const result = await encryptSecret(plaintext, password);

      // Encrypted content should not contain the plaintext
      expect(result.encryptedContent).not.toContain(plaintext);
      expect(result.encryptedContent).not.toContain('SuperSecret');
    });

    it('should produce encrypted content that looks like base64', async () => {
      const plaintext = 'Test message';
      const password = 'password123';

      const result = await encryptSecret(plaintext, password);

      // Base64 regex: only contains valid base64 characters
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      expect(result.encryptedContent).toMatch(base64Regex);
    });

    it('should handle empty string password rejection', async () => {
      const plaintext = 'Test message';

      await expect(encryptSecret(plaintext, '')).rejects.toThrow(EncryptionError);
    });
  });

  describe('Round-trip Tests', () => {
    const testCases = [
      { name: 'simple text', plaintext: 'Hello World' },
      { name: 'numbers', plaintext: '1234567890' },
      { name: 'special chars', plaintext: '!@#$%^&*()' },
      { name: 'newlines', plaintext: 'Line 1\nLine 2\nLine 3' },
      { name: 'tabs', plaintext: 'Col1\tCol2\tCol3' },
      { name: 'json', plaintext: '{"key": "value", "number": 42}' },
      { name: 'html', plaintext: '<div class="test">Content</div>' },
      { name: 'sql', plaintext: "SELECT * FROM users WHERE name = 'test'" },
      { name: 'whitespace', plaintext: '  spaces  and   tabs\t\there  ' },
      { name: 'empty after trim', plaintext: '   ' }, // spaces should be preserved
    ];

    testCases.forEach(({ name, plaintext }) => {
      it(`should round-trip ${name} correctly`, async () => {
        const password = 'testPassword123';

        const encrypted = await encryptSecret(plaintext, password);
        const decrypted = await decryptSecret(encrypted.encryptedContent, encrypted.salt, password);

        expect(decrypted).toBe(plaintext);
      });
    });
  });
});
