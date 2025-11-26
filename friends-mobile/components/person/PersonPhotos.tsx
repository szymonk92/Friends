import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Button, IconButton, useTheme } from 'react-native-paper';
import { usePersonPhotos, useAddPhotoToPerson, useTakePhoto, useSetProfilePhoto, useDeletePhoto } from '@/hooks/usePhotos';
import { useState } from 'react';
import PhotoBrowser from './PhotoBrowser';
import { useSettings } from '@/store/useSettings';

interface PersonPhotosProps {
    personId: string;
    currentPhotoId?: string | null;
}

export default function PersonPhotos({ personId, currentPhotoId }: PersonPhotosProps) {
    const theme = useTheme();
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
        // Check if we've reached the limit
        if (personPhotos.length >= maxPhotosPerPerson) {
            Alert.alert(
                'Photo Limit Reached',
                `You can only add up to ${maxPhotosPerPerson} photos per person. Delete a photo first or adjust the limit in Dev settings.`,
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Add Photo',
            'Choose how to add a photo',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Take Photo',
                    onPress: () => takePhoto.mutateAsync({ personId }),
                },
                {
                    text: 'Choose from Library',
                    onPress: () => addPhotoToPerson.mutateAsync({ personId }),
                },
            ]
        );
    };

    const handlePhotoPress = (index: number) => {
        setSelectedPhotoIndex(index);
        setBrowserVisible(true);
    };

    return (
        <View style={[styles.section, { borderBottomColor: theme.colors.surfaceVariant }]}>
            <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Photos ({personPhotos.length}/{maxPhotosPerPerson})
                </Text>
                <Button
                    mode="text"
                    compact
                    icon="image-plus"
                    onPress={handleAddPhoto}
                    disabled={personPhotos.length >= maxPhotosPerPerson}
                >
                    Add
                </Button>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {personPhotos.map((photo, index) => (
                    <TouchableOpacity
                        key={photo.id}
                        onPress={() => handlePhotoPress(index)}
                        onLongPress={() => {
                            Alert.alert(
                                'Photo Options',
                                'What would you like to do?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Set as Profile',
                                        onPress: () =>
                                            setProfilePhoto.mutateAsync({ personId, photoId: photo.id }),
                                    },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: () => deletePhoto.mutateAsync(photo.id),
                                    },
                                ]
                            );
                        }}
                        style={styles.photoThumbnailContainer}
                    >
                        <Image source={{ uri: photo.filePath }} style={styles.photoThumbnail} />
                        {currentPhotoId === photo.id && (
                            <View style={styles.profileBadge}>
                                <IconButton icon="account-check" size={12} iconColor="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <Text variant="labelSmall" style={[styles.photoHint, { color: theme.colors.onSurfaceVariant }]}>
                Tap to view • Long press for options
            </Text>

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
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: '600',
        fontSize: 18,
    },
    photoThumbnailContainer: {
        marginRight: 12,
        position: 'relative',
    },
    photoThumbnail: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    profileBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#4caf50',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoHint: {
        marginTop: 8,
        fontStyle: 'italic',
    },
});

