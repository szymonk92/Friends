import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { usePersonPhotos, useSetProfilePhoto, useDeletePhoto } from '@/hooks/usePhotos';
import { usePhotoPicker } from '@/hooks/usePhotoPicker';
import { useState } from 'react';
import PhotoBrowser from './PhotoBrowser';
import { PhotoOptionsSheet } from './PhotoOptionsSheet';
import { confirmDestructive } from '@/lib/utils/confirm';
import { useSettings } from '@/store/useSettings';
import { ProfileSection } from './ProfileSection';
import { LineIcon } from '@/components/LineIcon';
import { fz, fzText } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

interface PersonPhotosProps {
  personId: string;
  currentPhotoId?: string | null;
}

export default function PersonPhotos({ personId, currentPhotoId }: PersonPhotosProps) {
  const { t } = useTranslation();
  const { data: personPhotos = [] } = usePersonPhotos(personId);
  const { pickPhoto, photoSheet } = usePhotoPicker(personId);
  const setProfilePhoto = useSetProfilePhoto();
  const deletePhoto = useDeletePhoto();
  const maxPhotosPerPerson = useSettings((state) => state.maxPhotosPerPerson);

  const [browserVisible, setBrowserVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [optionsPhotoId, setOptionsPhotoId] = useState<string | null>(null);

  if (personPhotos.length === 0) return null;

  const handleAddPhoto = () => {
    if (personPhotos.length >= maxPhotosPerPerson) {
      Alert.alert(
        t('photos.limitTitle'),
        t('photos.limitMessage', { max: maxPhotosPerPerson }),
        [{ text: t('common.ok') }]
      );
      return;
    }

    pickPhoto();
  };

  const handleSetAsProfile = (photoId: string) =>
    setProfilePhoto.mutateAsync({ personId, photoId });

  // A sheet tap is one touch away from losing the photo — always confirm.
  const handleDelete = (photoId: string) =>
    confirmDestructive({
      title: t('photos.deleteTitle'),
      message: t('photos.deleteMessage'),
      onConfirm: () => deletePhoto.mutateAsync(photoId),
    });

  const handlePhotoPress = (index: number) => {
    setSelectedPhotoIndex(index);
    setBrowserVisible(true);
  };

  return (
    <ProfileSection
      label={t('photos.title')}
      count={`${personPhotos.length}/${maxPhotosPerPerson}`}
      onAdd={handleAddPhoto}
      divider={false}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {personPhotos.map((photo, index) => (
          <TouchableOpacity
            key={photo.id}
            onPress={() => handlePhotoPress(index)}
            onLongPress={() => setOptionsPhotoId(photo.id)}
            style={styles.thumbWrap}
          >
            <Image source={{ uri: photo.filePath }} style={styles.thumb} />
            {currentPhotoId === photo.id && (
              <View style={styles.profileBadge}>
                <LineIcon name="check" size={12} color="#fff" strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.hint}>Tap to view • Long press for options</Text>

      <PhotoBrowser
        visible={browserVisible}
        photos={personPhotos}
        initialIndex={selectedPhotoIndex}
        currentPhotoId={currentPhotoId}
        onClose={() => setBrowserVisible(false)}
        onSetAsProfile={(photoId) => {
          handleSetAsProfile(photoId);
          setBrowserVisible(false);
        }}
        onDelete={handleDelete}
      />
      <PhotoOptionsSheet
        photoId={optionsPhotoId}
        currentPhotoId={currentPhotoId}
        onDismiss={() => setOptionsPhotoId(null)}
        onSetAsProfile={handleSetAsProfile}
        onDelete={handleDelete}
      />
      {photoSheet}
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  thumbWrap: {
    marginRight: 12,
    position: 'relative',
  },
  thumb: {
    width: 104,
    height: 104,
    borderRadius: fz.rRow,
  },
  profileBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: fz.ink,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    ...fzText.time,
    fontStyle: 'italic',
    marginTop: 10,
  },
});