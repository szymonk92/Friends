import { StyleSheet, View, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Chip, IconButton, useTheme } from 'react-native-paper';
import { getInitials, formatRelativeTime, formatShortDate } from '@/lib/utils/format';
import { usePersonPhotos, useTakePhoto, useSetProfilePhoto, useAddPhotoToPerson } from '@/hooks/usePhotos';

interface PersonHeaderProps {
    person: any;
    onAvatarPress?: () => void;
}

export default function PersonHeader({ person, onAvatarPress }: PersonHeaderProps) {
    const theme = useTheme();
    const { data: personPhotos = [] } = usePersonPhotos(person.id);
    const takePhoto = useTakePhoto();
    const setProfilePhoto = useSetProfilePhoto();
    const addPhotoToPerson = useAddPhotoToPerson();

    // Get the profile photo path
    const profilePhoto = person?.photoId
        ? personPhotos.find((p) => p.id === person.photoId)
        : null;

    const handleAvatarPress = () => {
        if (onAvatarPress) {
            onAvatarPress();
            return;
        }

        Alert.alert(
            'Profile Photo',
            'Choose how to add a photo',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Take Photo',
                    onPress: async () => {
                        try {
                            const result = await takePhoto.mutateAsync({ personId: person.id });
                            await setProfilePhoto.mutateAsync({ personId: person.id, photoId: result.id });
                            Alert.alert('Success', 'Profile photo updated!');
                        } catch (error: any) {
                            if (!error.message.includes('cancelled')) {
                                Alert.alert('Error', error.message || 'Failed to take photo');
                            }
                        }
                    },
                },
                {
                    text: 'Choose from Library',
                    onPress: async () => {
                        try {
                            const result = await addPhotoToPerson.mutateAsync({ personId: person.id });
                            await setProfilePhoto.mutateAsync({ personId: person.id, photoId: result.id });
                            Alert.alert('Success', 'Profile photo updated!');
                        } catch (error: any) {
                            if (!error.message.includes('cancelled')) {
                                Alert.alert('Error', error.message || 'Failed to add photo');
                            }
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <View style={[styles.headerSection, { backgroundColor: theme.colors.background }]}>
            <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarContainer}>
                {profilePhoto ? (
                    <Image source={{ uri: profilePhoto.filePath }} style={styles.avatarImage} />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                        <Text style={[styles.avatarText, { color: theme.colors.onPrimary }]}>
                            {getInitials(person.name)}
                        </Text>
                    </View>
                )}
                {!profilePhoto && (
                    <View style={[styles.avatarBadge, { borderColor: theme.colors.background }]}>
                        <IconButton icon="camera" size={16} iconColor="#fff" style={styles.cameraIcon} />
                    </View>
                )}
            </TouchableOpacity>

            <Text variant="headlineMedium" style={[styles.name, { color: theme.colors.onBackground }]}>
                {person.name}
            </Text>

            {person.nickname && (
                <Text variant="bodyLarge" style={[styles.nickname, { color: theme.colors.onSurfaceVariant }]}>
                    "{person.nickname}"
                </Text>
            )}

            <View style={styles.chips}>
                {person.relationshipType && (
                    <Chip icon="heart" style={styles.chip} compact>
                        {person.relationshipType.charAt(0).toUpperCase() + person.relationshipType.slice(1)}
                    </Chip>
                )}
                {person.personType && (
                    <Chip icon="account" style={styles.chip} compact>
                        {person.personType.charAt(0).toUpperCase() + person.personType.slice(1)}
                    </Chip>
                )}
                {person.importanceToUser && person.importanceToUser !== 'unknown' && (
                    <Chip icon="star" style={styles.chip} compact>
                        {person.importanceToUser
                            .replace('_', ' ')
                            .split(' ')
                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')}
                    </Chip>
                )}
            </View>

            {person.metDate && (
                <Text variant="bodySmall" style={[styles.metDate, { color: theme.colors.onSurfaceVariant }]}>
                    Met on {formatShortDate(new Date(person.metDate))}
                </Text>
            )}

            {person.notes && (
                <View style={styles.notesSection}>
                    <Text variant="bodyMedium" style={[styles.notes, { color: theme.colors.onSurface }]}>
                        {person.notes}
                    </Text>
                </View>
            )}

            <Text variant="bodySmall" style={[styles.meta, { color: theme.colors.outline }]}>
                Last updated {formatRelativeTime(new Date(person.updatedAt))}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    headerSection: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#03dac6',
        borderRadius: 18,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
    },
    cameraIcon: {
        margin: 0,
        padding: 0,
    },
    name: {
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    nickname: {
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 12,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        marginTop: 12,
        marginBottom: 12,
    },
    chip: {
        marginRight: 4,
    },
    metDate: {
        marginTop: 8,
        textAlign: 'center',
    },
    notesSection: {
        marginTop: 16,
        paddingHorizontal: 4,
    },
    notes: {
        lineHeight: 22,
        textAlign: 'center',
    },
    meta: {
        marginTop: 12,
        fontSize: 12,
        textAlign: 'center',
    },
});
