import { useTranslation } from 'react-i18next';
import { ActionSheet } from '@/components/ActionSheet';

/** Set-as-profile / delete bottom sheet for one photo (thumbnail long-press and the photo browser). */
export function PhotoOptionsSheet({
  photoId,
  currentPhotoId,
  onDismiss,
  onSetAsProfile,
  onDelete,
}: {
  photoId: string | null;
  /** The person's current profile photo — its "Set as profile" row is disabled. */
  currentPhotoId?: string | null;
  onDismiss: () => void;
  onSetAsProfile: (photoId: string) => void;
  onDelete: (photoId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <ActionSheet
      visible={photoId !== null}
      title={t('photos.optionsTitle')}
      onDismiss={onDismiss}
      actions={
        photoId
          ? [
              {
                label: t('photos.setAsProfile'),
                icon: 'star',
                disabled: photoId === currentPhotoId,
                onPress: () => onSetAsProfile(photoId),
              },
              { label: t('common.delete'), icon: 'trash', onPress: () => onDelete(photoId) },
            ]
          : []
      }
    />
  );
}
