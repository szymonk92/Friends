import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  ActivityIndicator,
  Button,
  IconButton,
  Menu,
} from 'react-native-paper';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { fz, fzText } from '@/lib/design/tokens';
import { formatRelativeTime } from '@/lib/utils/format';

export default function PersonProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: person, isLoading: personLoading } = usePerson(id!);
  const deletePerson = useDeletePerson();

  const { data: personPhotos = [] } = usePersonPhotos(id!);
  const takePhoto = useTakePhoto();
  const setProfilePhoto = useSetProfilePhoto();
  const addPhotoToPerson = useAddPhotoToPerson();

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
            } catch (error: unknown) {
              const msg = error instanceof Error ? error.message : '';
              if (!msg.includes('cancelled')) {
                Alert.alert('Error', msg || 'Failed to take photo');
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
            } catch (error: unknown) {
              const msg = error instanceof Error ? error.message : '';
              if (!msg.includes('cancelled')) {
                Alert.alert('Error', msg || 'Failed to add photo');
              }
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const profilePhoto = person?.photoId ? personPhotos.find((p) => p.id === person.photoId) : null;

  if (personLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
        <Text style={{ ...fzText.sub, marginTop: 12 }}>Loading profile...</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centered}>
        <Text style={fzText.title}>Person not found</Text>
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
          headerStyle: { backgroundColor: fz.paper },
          headerTintColor: fz.ink,
          headerTitleStyle: { fontFamily: fz.font, fontWeight: '600', fontSize: 18 },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ marginRight: 4 }}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    onPress={() => setMenuVisible(true)}
                    iconColor={fz.ink}
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
                {person.personType !== 'self' && person.entityType !== 'pet' && (
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      router.push(`/person/relationship?personId=${id}`);
                    }}
                    title="View Relationship"
                    leadingIcon="link-variant"
                  />
                )}
                {person.personType !== 'self' && person.entityType !== 'pet' && (
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      router.push(`/person/compare-picker?personId=${id}`);
                    }}
                    title="Compare With…"
                    leadingIcon="account-multiple"
                  />
                )}
                {person.entityType !== 'pet' && (
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      router.push(`/person/add-relation?personId=${id}`);
                    }}
                    title="Add Relation"
                    leadingIcon="plus"
                  />
                )}
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
      <View style={styles.wrapper}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: insets.bottom + fz.s.xxl }}
        >
          <PersonHeader person={person} onAvatarPress={handleAvatarPress} />
          <PersonTags personId={id!} personName={person.name} />
          {person.entityType !== 'pet' && (
            <PersonQuickActions personId={id!} personName={person.name} />
          )}
          <PersonImportantDates person={person} />
          <PersonPhotos personId={id!} currentPhotoId={person.photoId} />
          <PersonGiftIdeas personId={id!} personName={person.name} />
          {person.entityType !== 'pet' && (
            <PersonRelations personId={id!} personName={person.name} />
          )}
          <PersonConnections personId={id!} personName={person.name} />
          <Text style={styles.footer}>
            Last updated {formatRelativeTime(new Date(person.updatedAt))}
          </Text>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: fz.paper,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: fz.paper,
  },
  backButton: {
    marginTop: 16,
  },
  footer: {
    ...fzText.time,
    textAlign: 'center',
    marginTop: 20,
  },
});