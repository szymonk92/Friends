import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import {
  usePersonPhotos,
  useAddPhotoToPerson,
  useTakePhoto,
  useSetProfilePhoto,
  useDeletePhoto,
} from '@/hooks/usePhotos';
import { useState } from 'react';
import PhotoBrowser from './PhotoBrowser';
import { useSettings } from '@/store/useSettings';
import { ProfileSection } from './ProfileSection';
import { LineIcon } from '@/components/LineIcon';
import { fz, fzText } from '@/lib/design/tokens';

interface PersonPhotosProps {
  personId: string;
  currentPhotoId?: string | null;
}

export default function PersonPhotos({ personId, currentPhotoId }: PersonPhotosProps) {
  const { data: personPhotos = [] } = usePersonPhotos(personId);
  const addPhotoToPerson = useAddPhotoToPerson();
  const takePhoto = useTakePhoto();
  const setProfilePhoto = useSetProfilePhoto();
  const deletePhoto = useDeletePhoto();
  const maxPhotosPerPerson = useSettings((state) => state.maxPhotosPerPerson);

  const [browserVisible, setBrowserVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  if (personPhotos.length === 0) return null;

  const handleAddPhoto = () => {
    if (personPhotos.length >= maxPhotosPerPerson) {
      Alert.alert(
        'Photo Limit Reached',
        `You can only add up to ${maxPhotosPerPerson} photos per person. Delete a photo first or adjust the limit in Dev settings.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert('Add Photo', 'Choose how to add a photo', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => takePhoto.mutateAsync({ personId }) },
      { text: 'Choose from Library', onPress: () => addPhotoToPerson.mutateAsync({ personId }) },
    ]);
  };

  const handlePhotoPress = (index: number) => {
    setSelectedPhotoIndex(index);
    setBrowserVisible(true);
  };

  return (
    <ProfileSection
      label="Photos"
      count={`${personPhotos.length}/${maxPhotosPerPerson}`}
      onAdd={handleAddPhoto}
      divider={false}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {personPhotos.map((photo, index) => (
          <TouchableOpacity
            key={photo.id}
            onPress={() => handlePhotoPress(index)}
            onLongPress={() => {
              Alert.alert('Photo Options', 'What would you like to do?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Set as Profile',
                  onPress: () => setProfilePhoto.mutateAsync({ personId, photoId: photo.id }),
                },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deletePhoto.mutateAsync(photo.id),
                },
              ]);
            }}
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
          setProfilePhoto.mutateAsync({ personId, photoId });
          setBrowserVisible(false);
        }}
        onDelete={(photoId) => {
          deletePhoto.mutateAsync(photoId);
        }}
      />
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