import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { confirmDestructive } from '@/lib/utils/confirm';
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
import { usePersonPhotos, useSetProfilePhoto } from '@/hooks/usePhotos';
import { usePhotoPicker } from '@/hooks/usePhotoPicker';

// Components
import PersonHeader from '@/components/person/PersonHeader';
import PersonNotes from '@/components/person/PersonNotes';
import PersonQuickActions from '@/components/person/PersonQuickActions';
import PersonTags from '@/components/person/PersonTags';
import PersonImportantDates from '@/components/person/PersonImportantDates';
import PersonPhotos from '@/components/person/PersonPhotos';
import PersonGiftIdeas from '@/components/person/PersonGiftIdeas';
import PersonRelations from '@/components/person/PersonRelations';
import PersonConnections from '@/components/person/PersonConnections';
import { fz, fzText } from '@/lib/design/tokens';
import { formatRelativeTime } from '@/lib/utils/format';
import { useTranslation } from 'react-i18next';

export default function PersonProfileScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: person, isLoading: personLoading } = usePerson(id!);
  const deletePerson = useDeletePerson();

  const { data: personPhotos = [] } = usePersonPhotos(id!);
  const setProfilePhoto = useSetProfilePhoto();
  const pickPhoto = usePhotoPicker(id!);

  const [menuVisible, setMenuVisible] = useState(false);

  const handleDelete = () => {
    confirmDestructive({
      title: t('profile.deletePersonTitle'),
      message: t('profile.deletePersonMessage', { name: person?.name }),
      onConfirm: async () => {
        await deletePerson.mutateAsync(id!);
        router.back();
      },
    });
  };

  const handleAvatarPress = () =>
    pickPhoto({
      title: t('photos.profilePhoto'),
      onSaved: async (photo) => {
        await setProfilePhoto.mutateAsync({ personId: id!, photoId: photo.id });
        Alert.alert(t('common.success'), t('profile.photoUpdated'));
      },
    });

  const profilePhoto = person?.photoId ? personPhotos.find((p) => p.id === person.photoId) : null;

  if (personLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
        <Text style={{ ...fzText.sub, marginTop: 12 }}>{t('profile.loading')}</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centered}>
        <Text style={fzText.title}>{t('profile.notFound')}</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
          {t('person.goBack')}
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
                    title={t('profile.changePhoto')}
                    leadingIcon="camera"
                  />
                )}
                {person.personType !== 'self' && person.entityType !== 'pet' && (
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      router.push(`/person/relationship?personId=${id}`);
                    }}
                    title={t('profile.viewRelationship')}
                    leadingIcon="link-variant"
                  />
                )}
                {person.personType !== 'self' && person.entityType !== 'pet' && (
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      router.push(`/person/compare-picker?personId=${id}`);
                    }}
                    title={t('profile.compareWith')}
                    leadingIcon="account-multiple"
                  />
                )}
                {person.entityType !== 'pet' && (
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      router.push(`/person/add-relation?personId=${id}`);
                    }}
                    title={t('profile.addRelation')}
                    leadingIcon="plus"
                  />
                )}
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    router.push(`/person/edit?personId=${id}`);
                  }}
                  title={t('common.edit')}
                  leadingIcon="pencil"
                />
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    handleDelete();
                  }}
                  title={t('common.delete')}
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
          <PersonNotes person={person} />
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