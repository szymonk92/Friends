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
          Alert.alert('Error', message || 'Failed to save photo');
        }
      }
    };

    Alert.alert(options.title ?? 'Add Photo', 'Choose how to add a photo', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: saveWith(() => takePhoto.mutateAsync({ personId })) },
      {
        text: 'Choose from Library',
        onPress: saveWith(() => addPhotoToPerson.mutateAsync({ personId })),
      },
    ]);
  };
}
