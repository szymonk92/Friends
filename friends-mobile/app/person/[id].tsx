import { StyleSheet, View, ScrollView } from 'react-native';
import { confirmDestructive } from '@/lib/utils/confirm';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { IconCircle } from '@/components/IconCircle';
import { AppBar } from '@/components/AppBar';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { usePerson, useDeletePerson, useUpdatePerson } from '@/hooks/usePeople';
import { usePersonConnections } from '@/hooks/useConnections';
import { useSetProfilePhoto } from '@/hooks/usePhotos';
import { usePhotoPicker } from '@/hooks/usePhotoPicker';
import { ActionSheet, type ActionSheetAction } from '@/components/ActionSheet';

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
  const updatePerson = useUpdatePerson();
  const { data: connections = [] } = usePersonConnections(id!);

  // Kids are created as 'mentioned' people on the child side of a parent link
  // (person1 = parent for 'child', person2 = parent for 'parent'). Once they're
  // primary they're a regular contact and the parent link just stays as family.
  const isChild =
    person?.personType !== 'primary' &&
    person?.personType !== 'self' &&
    connections.some(
      (c) =>
        (c.relationshipType === 'child' && c.person2Id === id) ||
        (c.relationshipType === 'parent' && c.person1Id === id)
    );

  const setProfilePhoto = useSetProfilePhoto();
  const { pickPhoto, photoSheet } = usePhotoPicker(id!);

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
      },
    });

  const isHuman = person?.entityType !== 'pet';
  const isOther = person?.personType !== 'self' && isHuman;
  // Existing partners are shown under the name (PartnerBadge); adding one lives here.
  const canAddPartner =
    isHuman &&
    person?.relationshipType !== 'partner' &&
    !connections.some((c) => c.relationshipType === 'partner' && c.status !== 'ended');
  const topActions: ActionSheetAction[] = [
    ...(canAddPartner
      ? [
          {
            label: t('partnerBadge.add'),
            icon: 'heart' as const,
            onPress: () =>
              router.push(`/person/add-connection?personId=${id}&relationshipType=partner`),
          },
        ]
      : []),
    ...(isOther
      ? [
          {
            label: t('profile.viewRelationship'),
            icon: 'network' as const,
            onPress: () => router.push(`/person/relationship?personId=${id}`),
          },
          {
            label: t('profile.compareWith'),
            icon: 'users' as const,
            onPress: () => router.push(`/person/compare-picker?personId=${id}`),
          },
        ]
      : []),
    ...(isChild
      ? [
          {
            label: t('profile.convertToAdult'),
            icon: 'accountPlus' as const,
            onPress: () => updatePerson.mutate({ id: id!, personType: 'primary' }),
          },
        ]
      : []),
  ];
  const menuActions: ActionSheetAction[] = [
    ...topActions,
    {
      label: t('common.edit'),
      icon: 'pencil',
      onPress: () => router.push(`/person/edit?personId=${id}`),
      // Hairline between "look at" actions and edit/delete, only when both groups exist.
      divider: topActions.length > 0,
    },
    { label: t('common.delete'), icon: 'trash', onPress: handleDelete },
  ];

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
      <View style={styles.wrapper}>
        <AppBar
          title={person.name}
          right={<IconCircle icon="more" onPress={() => setMenuVisible(true)} />}
        />
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: insets.bottom + fz.s.xxl }}
        >
          <PersonHeader person={person} onAvatarPress={handleAvatarPress} />
          {photoSheet}
          <ActionSheet
            visible={menuVisible}
            title={person.name}
            onDismiss={() => setMenuVisible(false)}
            actions={menuActions}
          />
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
            {t('profile.lastUpdated', { time: formatRelativeTime(new Date(person.updatedAt)) })}
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
