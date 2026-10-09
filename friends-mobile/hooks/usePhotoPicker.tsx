import { tr } from '@/lib/i18n/labels';

import { useState } from 'react';
import { useAddPhotoToPerson, useTakePhoto } from '@/hooks/usePhotos';
import { ActionSheet } from '@/components/ActionSheet';
import type { SavedPhoto } from '@/lib/utils/photos';
import { fzAlert } from '@/lib/utils/confirm';

type PickOptions = { title?: string; onSaved?: (photo: SavedPhoto) => Promise<void> | void };

/**
 * The "Take Photo / Choose from Library" bottom sheet for a person. Call
 * `pickPhoto()` to open it and render `photoSheet` once. Saves the chosen
 * image, then calls `onSaved` with it. Cancelling is silent; permission and
 * save errors are shown in an alert.
 */
export function usePhotoPicker(personId: string) {
  const takePhoto = useTakePhoto();
  const addPhotoToPerson = useAddPhotoToPerson();
  const [pending, setPending] = useState<PickOptions | null>(null);

  const saveWith = (options: PickOptions, save: () => Promise<SavedPhoto>) => async () => {
    try {
      const photo = await save();
      await options.onSaved?.(photo);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!/cancel/i.test(message)) {
        const known: Record<string, string> = {
          'Permission to access photos was denied': tr('photos.permissionPhotos', message),
          'Permission to access camera was denied': tr('photos.permissionCamera', message),
          'Photo not found': tr('photos.notFound', message),
        };
        fzAlert(
          tr('common.error', 'Error'),
          known[message] || message || tr('photos.saveFailed', 'Failed to save photo')
        );
      }
    }
  };

  const photoSheet = (
    <ActionSheet
      visible={pending !== null}
      title={pending?.title ?? tr('photos.addPhoto', 'Add Photo')}
      onDismiss={() => setPending(null)}
      actions={
        pending
          ? [
              {
                label: tr('photos.takePhoto', 'Take Photo'),
                icon: 'camera',
                onPress: saveWith(pending, () => takePhoto.mutateAsync({ personId })),
              },
              {
                label: tr('photos.chooseLibrary', 'Choose from Library'),
                icon: 'image',
                onPress: saveWith(pending, () => addPhotoToPerson.mutateAsync({ personId })),
              },
            ]
          : []
      }
    />
  );

  return { pickPhoto: (options: PickOptions = {}) => setPending(options), photoSheet };
}
