import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db, getCurrentUserId } from '@/lib/db';
import { secrets, type NewSecret } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import {
  authenticateUser,
  getEncryptionKey,
  encryptContent,
  decryptContent,
  initializeEncryptionKey,
  isSecretsSetup,
  checkBiometricStatus,
  type BiometricStatus,
} from '@/lib/crypto/biometric-secrets';

/**
 * Hook to check biometric status
 */
export function useBiometricStatus() {
  return useQuery({
    queryKey: ['biometricStatus'],
    queryFn: checkBiometricStatus,
    staleTime: Infinity, // Status doesn't change often
  });
}

/**
 * Hook to check if secrets encryption is initialized
 */
export function useSecretsSetupStatus() {
  return useQuery({
    queryKey: ['secretsSetup'],
    queryFn: isSecretsSetup,
  });
}

/**
 * Hook to initialize secrets encryption
 */
export function useInitializeSecrets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // First authenticate
      const authResult = await authenticateUser('Set up secrets protection');
      if (!authResult.success) {
        throw new Error(authResult.error || 'Authentication failed');
      }

      // Initialize encryption key
      const success = await initializeEncryptionKey();
      if (!success) {
        throw new Error('Failed to initialize encryption');
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretsSetup'] });
    },
  });
}

/**
 * Hook to fetch all secrets (metadata only, not decrypted)
 */
export function useSecrets() {
  return useQuery({
    queryKey: ['secrets'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select({
          id: secrets.id,
          title: secrets.title,
          personId: secrets.personId,
          createdAt: secrets.createdAt,
          updatedAt: secrets.updatedAt,
        })
        .from(secrets)
        .where(and(eq(secrets.userId, userId), isNull(secrets.deletedAt)));
    },
  });
}

/**
 * Hook to create a new secret
 */
export function useCreateSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      content,
      personId,
    }: {
      title: string;
      content: string;
      personId?: string;
    }) => {
      // Authenticate and get encryption key
      const key = await getEncryptionKey();
      if (!key) {
        throw new Error('Failed to authenticate or get encryption key');
      }

      // Encrypt the content
      const encryptedContent = await encryptContent(content, key);

      // Generate salt (for future password-based option)
      const saltBytes = await randomUUID();
      const salt = saltBytes.replace(/-/g, '');

      const userId = await getCurrentUserId();

      // Save to database
      const result = await db
        .insert(secrets)
        .values({
          id: randomUUID(),
          userId,
          title,
          encryptedContent,
          encryptionSalt: salt,
          personId: personId || null,
        })
        .returning();

      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets'] });
    },
  });
}

/**
 * Hook to decrypt and view a secret
 */
export function useDecryptSecret() {
  return useMutation({
    mutationFn: async (secretId: string) => {
      // Authenticate and get encryption key
      const key = await getEncryptionKey();
      if (!key) {
        throw new Error('Failed to authenticate or get encryption key');
      }

      // Fetch the encrypted secret
      const result = await db.select().from(secrets).where(eq(secrets.id, secretId)).limit(1);

      if (!result[0]) {
        throw new Error('Secret not found');
      }

      const secret = result[0];

      // Decrypt the content
      const decryptedContent = await decryptContent(secret.encryptedContent, key);

      // Update last accessed timestamp
      await db
        .update(secrets)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(secrets.id, secretId));

      return {
        id: secret.id,
        title: secret.title,
        content: decryptedContent,
        personId: secret.personId,
        createdAt: secret.createdAt,
      };
    },
  });
}

/**
 * Hook to update a secret
 */
export function useUpdateSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      content,
    }: {
      id: string;
      title?: string;
      content?: string;
    }) => {
      const updates: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (title) {
        updates.title = title;
      }

      if (content) {
        // Authenticate and get encryption key
        const key = await getEncryptionKey();
        if (!key) {
          throw new Error('Failed to authenticate or get encryption key');
        }

        // Re-encrypt with new content
        updates.encryptedContent = await encryptContent(content, key);
      }

      const result = await db.update(secrets).set(updates).where(eq(secrets.id, id)).returning();

      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets'] });
    },
  });
}

/**
 * Hook to delete a secret
 */
export function useDeleteSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (secretId: string) => {
      // Soft delete
      await db
        .update(secrets)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(secrets.id, secretId));

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets'] });
    },
  });
}

/**
 * Hook to authenticate (just verify, don't decrypt anything)
 */
export function useAuthenticateSecrets() {
  return useMutation({
    mutationFn: async (promptMessage?: string) => {
      const result = await authenticateUser(promptMessage || 'Authenticate to access secrets');
      if (!result.success) {
        throw new Error(result.error || 'Authentication failed');
      }
      return result;
    },
  });
}
