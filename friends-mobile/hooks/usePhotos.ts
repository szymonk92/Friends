import { db, getCurrentUserId } from '@/lib/db';
import { files, people } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { and, eq, isNull } from 'drizzle-orm';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import { resolvePhotoUri, saveProfileImageFile, type SavedPhoto } from '@/lib/utils/photos';

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
        filePath: resolvePhotoUri(f.filePath),
        thumbnailPath: f.thumbnailPath || undefined,
        createdAt: new Date(f.createdAt),
      })) as PhotoInfo[];
    },
    enabled: !!personId,
  });
}

// Square crop, compressed: profile photos never need more.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

/**
 * Shared cache refresh after a photo is saved for a person.
 */
function usePhotoSavedInvalidation() {
  const queryClient = useQueryClient();
  return (photo: SavedPhoto) => {
    if (photo.personId) {
      queryClient.invalidateQueries({ queryKey: ['photos', 'person', photo.personId] });
      queryClient.invalidateQueries({ queryKey: ['people', photo.personId] });
    }
  };
}

/**
 * Hook to pick and save a photo for a person
 */
export function useAddPhotoToPerson() {
  const onPhotoSaved = usePhotoSavedInvalidation();
  return useMutation({
    mutationFn: async ({ personId }: { personId: string }) => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Permission to access photos was denied');
      }

      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (result.canceled) {
        throw new Error('Photo selection cancelled');
      }

      const asset = result.assets[0];
      return saveProfileImageFile({
        sourceUri: asset.uri,
        mimeType: asset.mimeType ?? undefined,
        personId,
      });
    },
    onSuccess: onPhotoSaved,
  });
}

/**
 * Hook to take a photo with the camera
 */
export function useTakePhoto() {
  const onPhotoSaved = usePhotoSavedInvalidation();
  return useMutation({
    mutationFn: async ({ personId }: { personId: string }) => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Permission to access camera was denied');
      }

      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (result.canceled) {
        throw new Error('Photo capture cancelled');
      }

      return saveProfileImageFile({
        sourceUri: result.assets[0].uri,
        mimeType: 'image/jpeg',
        personId,
      });
    },
    onSuccess: onPhotoSaved,
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
          const fileToDelete = new ExpoFile(resolvePhotoUri(photo[0].filePath));
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
