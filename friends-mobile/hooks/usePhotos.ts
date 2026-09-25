import { db, getCurrentUserId } from '@/lib/db';
import { files, people } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { Paths, File as ExpoFile, Directory } from 'expo-file-system';

export interface PhotoInfo {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  filePath: string;
  thumbnailPath?: string;
  createdAt: Date;
}

/**
 * Hook to get all photos for a person
 */
export function usePersonPhotos(personId: string) {
  return useQuery({
    queryKey: ['photos', 'person', personId],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const results = await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.userId, userId),
            eq(files.personId, personId),
            eq(files.fileType, 'profile_photo'),
            isNull(files.deletedAt)
          )
        );

      return results.map((f) => ({
        id: f.id,
        filename: f.filename,
        mimeType: f.mimeType,
        size: f.size,
        filePath: f.filePath,
        thumbnailPath: f.thumbnailPath || undefined,
        createdAt: new Date(f.createdAt),
      })) as PhotoInfo[];
    },
    enabled: !!personId,
  });
}

/**
 * Hook to pick and save a photo for a person
 */
export function useAddPhotoToPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId }: { personId: string }) => {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access photos was denied');
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        throw new Error('Photo selection cancelled');
      }

      const asset = result.assets[0];
      const userId = await getCurrentUserId();

      // Create a directory for photos if it doesn't exist
      const photoDir = new Directory(Paths.document, 'photos');
      if (!photoDir.exists) {
        photoDir.create();
      }

      // Generate unique filename
      const fileId = randomUUID();
      const extension = asset.uri.split('.').pop() || 'jpg';
      const filename = `${fileId}.${extension}`;
      const newFile = new ExpoFile(photoDir, filename);

      // Copy file to app's document directory
      const sourceFile = new ExpoFile(asset.uri);
      sourceFile.copy(newFile);

      // Get file size
      const fileSize = newFile.size || 0;
      const filePath = newFile.uri;

      // Save to database
      const fileRecord = await db
        .insert(files)
        .values({
          id: fileId,
          userId,
          filename,
          mimeType: asset.mimeType || 'image/jpeg',
          size: fileSize,
          filePath,
          fileType: 'profile_photo',
          personId,
        })
        .returning();

      return fileRecord[0];
    },
    onSuccess: (data) => {
      if (data?.personId) {
        queryClient.invalidateQueries({ queryKey: ['photos', 'person', data.personId] });
        queryClient.invalidateQueries({ queryKey: ['people', data.personId] });
      }
    },
  });
}

/**
 * Hook to set a person's profile photo
 */
export function useSetProfilePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId, photoId }: { personId: string; photoId: string }) => {
      await db
        .update(people)
        .set({
          photoId,
          updatedAt: new Date(),
        })
        .where(eq(people.id, personId));

      return { personId, photoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['people', data.personId] });
    },
  });
}

/**
 * Hook to delete a photo
 */
export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoId: string) => {
      // Get the photo to find file path
      const photo = await db.select().from(files).where(eq(files.id, photoId)).limit(1);

      if (photo.length > 0) {
        // Delete physical file
        try {
          const fileToDelete = new ExpoFile(photo[0].filePath);
          fileToDelete.delete();
        } catch {
          // File may not exist, continue
        }

        // Soft delete in database
        await db.update(files).set({ deletedAt: new Date() }).where(eq(files.id, photoId));

        return photo[0];
      }

      throw new Error('Photo not found');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      if (data?.personId) {
        queryClient.invalidateQueries({ queryKey: ['photos', 'person', data.personId] });
      }
    },
  });
}

/**
 * Hook to take a photo with the camera
 */
export function useTakePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId }: { personId: string }) => {
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera was denied');
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        throw new Error('Photo capture cancelled');
      }

      const asset = result.assets[0];
      const userId = await getCurrentUserId();

      // Create a directory for photos if it doesn't exist
      const photoDir = new Directory(Paths.document, 'photos');
      if (!photoDir.exists) {
        photoDir.create();
      }

      // Generate unique filename
      const fileId = randomUUID();
      const extension = 'jpg';
      const filename = `${fileId}.${extension}`;
      const newFile = new ExpoFile(photoDir, filename);

      // Copy file to app's document directory
      const sourceFile = new ExpoFile(asset.uri);
      sourceFile.copy(newFile);

      // Get file size
      const fileSize = newFile.size || 0;
      const filePath = newFile.uri;

      // Save to database
      const fileRecord = await db
        .insert(files)
        .values({
          id: fileId,
          userId,
          filename,
          mimeType: 'image/jpeg',
          size: fileSize,
          filePath,
          fileType: 'profile_photo',
          personId,
        })
        .returning();

      return fileRecord[0];
    },
    onSuccess: (data) => {
      if (data?.personId) {
        queryClient.invalidateQueries({ queryKey: ['photos', 'person', data.personId] });
        queryClient.invalidateQueries({ queryKey: ['people', data.personId] });
      }
    },
  });
}
