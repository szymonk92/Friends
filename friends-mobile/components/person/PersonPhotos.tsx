import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Button, IconButton, useTheme } from 'react-native-paper';
import { usePersonPhotos, useAddPhotoToPerson, useTakePhoto, useSetProfilePhoto, useDeletePhoto } from '@/hooks/usePhotos';

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

    if (personPhotos.length === 0) return null;

    return (
        <View style={[styles.section, { borderBottomColor: theme.colors.surfaceVariant }]}>
            <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Photos ({personPhotos.length})
                </Text>
                <Button
                    mode="text"
                    compact
                    icon="image-plus"
                    onPress={() => {
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
                    }}
                >
                    Add
                </Button>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {personPhotos.map((photo) => (
                    <TouchableOpacity
                        key={photo.id}
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
                Long press on a photo for options
            </Text>
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
