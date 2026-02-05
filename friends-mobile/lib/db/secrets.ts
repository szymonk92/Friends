/**
 * Secrets Service
 *
 * Provides CRUD operations for encrypted secrets.
 * All content is encrypted before storage and decrypted on retrieval.
 *
 * SECURITY:
 * - Content is never stored in plaintext
 * - Each secret has its own unique salt
 * - User must provide password to access secrets
 * - Failed decryption attempts are logged (for audit)
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db } from './index';
import { secrets } from './schema';
import { encryptSecret, decryptSecret, changePassword } from '../crypto';

/**
 * Secret with decrypted content
 */
export interface DecryptedSecret {
  id: string;
  userId: string;
  personId: string | null;
  title: string;
  content: string; // Decrypted content
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Secret metadata (without content)
 */
export interface SecretMetadata {
  id: string;
  userId: string;
  personId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new encrypted secret
 *
 * @param userId - The user's ID
 * @param title - A title/label for the secret
 * @param content - The sensitive content to encrypt
 * @param password - The password to encrypt with
 * @param personId - Optional: Associate with a specific person
 */
export async function createSecret(
  userId: string,
  title: string,
  content: string,
  password: string,
  personId?: string
): Promise<SecretMetadata> {
  // Encrypt the content
  const { encryptedContent, salt } = await encryptSecret(content, password);

  // Insert into database
  const result = await db
    .insert(secrets)
    .values({
      userId,
      personId: personId ?? null,
      title,
      encryptedContent,
      encryptionSalt: salt,
    })
    .returning({
      id: secrets.id,
      userId: secrets.userId,
      personId: secrets.personId,
      title: secrets.title,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    });

  return result[0];
}

/**
 * Get a secret and decrypt its content
 *
 * @param secretId - The secret's ID
 * @param userId - The user's ID (for authorization)
 * @param password - The password to decrypt with
 * @throws {EncryptionError} if decryption fails (wrong password)
 */
export async function getSecret(
  secretId: string,
  userId: string,
  password: string
): Promise<DecryptedSecret | null> {
  // Fetch the encrypted secret
  const [secret] = await db
    .select()
    .from(secrets)
    .where(and(eq(secrets.id, secretId), eq(secrets.userId, userId), isNull(secrets.deletedAt)));

  if (!secret) {
    return null;
  }

  // Decrypt the content
  const content = await decryptSecret(secret.encryptedContent, secret.encryptionSalt, password);

  return {
    id: secret.id,
    userId: secret.userId,
    personId: secret.personId,
    title: secret.title,
    content,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  };
}

/**
 * List all secrets for a user (metadata only, no decryption)
 */
export async function listSecrets(userId: string, personId?: string): Promise<SecretMetadata[]> {
  const conditions = [eq(secrets.userId, userId), isNull(secrets.deletedAt)];

  if (personId) {
    conditions.push(eq(secrets.personId, personId));
  }

  const results = await db
    .select({
      id: secrets.id,
      userId: secrets.userId,
      personId: secrets.personId,
      title: secrets.title,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    })
    .from(secrets)
    .where(and(...conditions));

  return results;
}

/**
 * Update a secret's content
 *
 * @param secretId - The secret's ID
 * @param userId - The user's ID (for authorization)
 * @param newContent - The new content to encrypt
 * @param password - The password to encrypt with
 */
export async function updateSecretContent(
  secretId: string,
  userId: string,
  newContent: string,
  password: string
): Promise<SecretMetadata | null> {
  // Verify the secret exists and belongs to the user
  const [existing] = await db
    .select({ id: secrets.id })
    .from(secrets)
    .where(and(eq(secrets.id, secretId), eq(secrets.userId, userId), isNull(secrets.deletedAt)));

  if (!existing) {
    return null;
  }

  // Encrypt the new content with a fresh salt
  const { encryptedContent, salt } = await encryptSecret(newContent, password);

  // Update the secret
  const result = await db
    .update(secrets)
    .set({
      encryptedContent,
      encryptionSalt: salt,
      updatedAt: new Date(),
    })
    .where(eq(secrets.id, secretId))
    .returning({
      id: secrets.id,
      userId: secrets.userId,
      personId: secrets.personId,
      title: secrets.title,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    });

  return result[0];
}

/**
 * Update a secret's title
 */
export async function updateSecretTitle(
  secretId: string,
  userId: string,
  newTitle: string
): Promise<SecretMetadata | null> {
  const result = await db
    .update(secrets)
    .set({
      title: newTitle,
      updatedAt: new Date(),
    })
    .where(and(eq(secrets.id, secretId), eq(secrets.userId, userId), isNull(secrets.deletedAt)))
    .returning({
      id: secrets.id,
      userId: secrets.userId,
      personId: secrets.personId,
      title: secrets.title,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    });

  return result[0] ?? null;
}

/**
 * Change the password for a secret
 * Requires the old password to decrypt, then re-encrypts with new password
 */
export async function changeSecretPassword(
  secretId: string,
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  // Fetch the encrypted secret
  const [secret] = await db
    .select()
    .from(secrets)
    .where(and(eq(secrets.id, secretId), eq(secrets.userId, userId), isNull(secrets.deletedAt)));

  if (!secret) {
    return false;
  }

  // Re-encrypt with new password
  const { encryptedContent, salt } = await changePassword(
    secret.encryptedContent,
    secret.encryptionSalt,
    oldPassword,
    newPassword
  );

  // Update the secret
  await db
    .update(secrets)
    .set({
      encryptedContent,
      encryptionSalt: salt,
      updatedAt: new Date(),
    })
    .where(eq(secrets.id, secretId));

  return true;
}

/**
 * Soft delete a secret
 */
export async function deleteSecret(secretId: string, userId: string): Promise<boolean> {
  const result = await db
    .update(secrets)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(secrets.id, secretId), eq(secrets.userId, userId), isNull(secrets.deletedAt)));

  return result.changes > 0;
}

/**
 * Permanently delete a secret (no recovery possible)
 * Use with caution - only for GDPR/user deletion requests
 */
export async function permanentlyDeleteSecret(secretId: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(secrets)
    .where(and(eq(secrets.id, secretId), eq(secrets.userId, userId)));

  return result.changes > 0;
}

/**
 * Check if a password is correct for a secret without returning the content
 */
export async function verifySecretPassword(
  secretId: string,
  userId: string,
  password: string
): Promise<boolean> {
  const [secret] = await db
    .select({
      encryptedContent: secrets.encryptedContent,
      encryptionSalt: secrets.encryptionSalt,
    })
    .from(secrets)
    .where(and(eq(secrets.id, secretId), eq(secrets.userId, userId), isNull(secrets.deletedAt)));

  if (!secret) {
    return false;
  }

  try {
    await decryptSecret(secret.encryptedContent, secret.encryptionSalt, password);
    return true;
  } catch {
    return false;
  }
}
