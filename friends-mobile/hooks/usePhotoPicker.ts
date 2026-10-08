import { tr } from '@/lib/i18n/labels';
import { Alert } from 'react-native';
import { useAddPhotoToPerson, useTakePhoto } from '@/hooks/usePhotos';
import type { SavedPhoto } from '@/lib/utils/photos';

/**
 * The "Take Photo / Choose from Library" sheet for a person. Saves the chosen
 * image, then calls `onSaved` with it. Cancelling is silent; permission and
 * save errors are shown in an alert (instead of surfacing as unhandled
 * promise rejections from the sheet's buttons).
 */
export function usePhotoPicker(personId: string) {
  const takePhoto = useTakePhoto();
  const addPhotoToPerson = useAddPhotoToPerson();

  return (
    options: { title?: string; onSaved?: (photo: SavedPhoto) => Promise<void> | void } = {}
  ) => {
    const saveWith = (save: () => Promise<SavedPhoto>) => async () => {
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
          Alert.alert(
            tr('common.error', 'Error'),
            known[message] || message || tr('photos.saveFailed', 'Failed to save photo')
          );
        }
      }
    };

    Alert.alert(options.title ?? tr('photos.addPhoto', 'Add Photo'), tr('photos.chooseHow', 'Choose how to add a photo'), [
      { text: tr('common.cancel', 'Cancel'), style: 'cancel' },
      { text: tr('photos.takePhoto', 'Take Photo'), onPress: saveWith(() => takePhoto.mutateAsync({ personId })) },
      {
        text: tr('photos.chooseLibrary', 'Choose from Library'),
        onPress: saveWith(() => addPhotoToPerson.mutateAsync({ personId })),
      },
    ]);
  };
}
