import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  Menu,
  useTheme,
} from 'react-native-paper';
import { useState } from 'react';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { usePerson, useDeletePerson } from '@/hooks/usePeople';
import {
  usePersonPhotos,
  useTakePhoto,
  useSetProfilePhoto,
  useAddPhotoToPerson,
} from '@/hooks/usePhotos';

// Components
import PersonHeader from '@/components/person/PersonHeader';
import PersonQuickActions from '@/components/person/PersonQuickActions';
import PersonTags from '@/components/person/PersonTags';
import PersonImportantDates from '@/components/person/PersonImportantDates';
import PersonPhotos from '@/components/person/PersonPhotos';
import PersonGiftIdeas from '@/components/person/PersonGiftIdeas';
import PersonRelations from '@/components/person/PersonRelations';
import PersonConnections from '@/components/person/PersonConnections';
import { spacing } from '@/styles/spacing';

export default function PersonProfileScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: person, isLoading: personLoading } = usePerson(id!);
  const deletePerson = useDeletePerson();

  // Photo hooks for the menu action
  const { data: personPhotos = [] } = usePersonPhotos(id!);
  const takePhoto = useTakePhoto();
  const setProfilePhoto = useSetProfilePhoto();
  const addPhotoToPerson = useAddPhotoToPerson();

  // Menu state
  const [menuVisible, setMenuVisible] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Person',
      `Are you sure you want to delete ${person?.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePerson.mutateAsync(id!);
            router.back();
          },
        },
      ]
    );
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Profile Photo',
      'Choose how to add a photo',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const result = await takePhoto.mutateAsync({ personId: id! });
              await setProfilePhoto.mutateAsync({ personId: id!, photoId: result.id });
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
              const result = await addPhotoToPerson.mutateAsync({ personId: id! });
              await setProfilePhoto.mutateAsync({ personId: id!, photoId: result.id });
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

  // Get the profile photo path for the menu check
  const profilePhoto = person?.photoId ? personPhotos.find((p) => p.id === person.photoId) : null;

  if (personLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centered}>
        <Text variant="headlineSmall">Person not found</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: person.name,
          headerRight: () => (
            // Menu padding
            <View style={{ marginRight: spacing.xs }}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    onPress={() => setMenuVisible(true)}
                    iconColor={theme.colors.primary}
                  />
                }
              >
                {profilePhoto && (
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      handleAvatarPress();
                    }}
                    title="Change Photo"
                    leadingIcon="camera"
                  />
                )}
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    router.push(`/person/add-relation?personId=${id}`);
                  }}
                  title="Add Relation"
                  leadingIcon="plus"
                />
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    router.push(`/person/edit?personId=${id}`);
                  }}
                  title="Edit"
                  leadingIcon="pencil"
                />
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    handleDelete();
                  }}
                  title="Delete"
                  leadingIcon="delete"
                  titleStyle={{ color: '#d32f2f' }}
                />
              </Menu>
            </View>
          ),
        }}
      />
      <View style={[styles.wrapper, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.container}>
          <PersonHeader person={person} onAvatarPress={handleAvatarPress} />

          <Divider style={styles.mainDivider} />

          <PersonTags personId={id!} personName={person.name} />

          <PersonQuickActions personId={id!} personName={person.name} />

          <PersonImportantDates person={person} />

          <PersonPhotos personId={id!} currentPhotoId={person.photoId} />

          <PersonGiftIdeas personId={id!} personName={person.name} />

          <PersonRelations personId={id!} personName={person.name} />

          <PersonConnections personId={id!} personName={person.name} />

          <View style={styles.spacer} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
  },
  mainDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  spacer: {
    height: 40,
  },
});
