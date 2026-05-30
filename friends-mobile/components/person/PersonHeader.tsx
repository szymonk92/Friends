import { StyleSheet, View, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Text, Chip, IconButton, useTheme } from 'react-native-paper';
import { getInitials, formatRelativeTime, formatShortDate } from '@/lib/utils/format';
import {
  usePersonPhotos,
  useTakePhoto,
  useSetProfilePhoto,
  useAddPhotoToPerson,
} from '@/hooks/usePhotos';
import type { Person } from '@/lib/db/schema';
import SocialLinksStrip from './SocialLinksStrip';
import PartnerBadge from './PartnerBadge';
import { parseSocialLinksJson } from '@/lib/social/socialLinks';
import { parseLanguagesJson } from '@/lib/utils/languages';

interface PersonHeaderProps {
  person: Person;
  onAvatarPress?: () => void;
}

function formatMetLine(metDate: Date | null | undefined, metLocation: string | null | undefined): string {
  const datePart = metDate ? formatShortDate(new Date(metDate)) : '';
  const locationPart = metLocation?.trim() || '';
  if (datePart && locationPart) return `Met in ${locationPart} · ${datePart}`;
  if (locationPart) return `Met in ${locationPart}`;
  return `Met ${datePart}`;
}

function ContactQuickRow({
  phone,
  email,
  primaryColor,
}: {
  phone: string | null | undefined;
  email: string | null | undefined;
  primaryColor: string;
}) {
  if (!phone && !email) return null;

  const callOrText = async (value: string, scheme: 'tel:' | 'mailto:') => {
    const url = `${scheme}${value}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert(scheme === 'tel:' ? 'Phone' : 'Email', value);
    } catch {
      Alert.alert(scheme === 'tel:' ? 'Phone' : 'Email', value);
    }
  };

  const copy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  return (
    <View style={styles.contactRow}>
      {phone && (
        <IconButton
          icon="phone"
          mode="contained-tonal"
          size={18}
          onPress={() => callOrText(phone, 'tel:')}
          onLongPress={() => copy(phone, 'Phone')}
          accessibilityLabel={`Call ${phone}`}
          iconColor={primaryColor}
          style={styles.contactIcon}
        />
      )}
      {email && (
        <IconButton
          icon="email"
          mode="contained-tonal"
          size={18}
          onPress={() => callOrText(email, 'mailto:')}
          onLongPress={() => copy(email, 'Email')}
          accessibilityLabel={`Email ${email}`}
          iconColor={primaryColor}
          style={styles.contactIcon}
        />
      )}
    </View>
  );
}

const NOTES_PREVIEW_CHARS = 220;

function PersonNotes({ text }: { text: string }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const overflow = text.length > NOTES_PREVIEW_CHARS;
  const visible = !overflow || expanded ? text : `${text.slice(0, NOTES_PREVIEW_CHARS).trimEnd()}…`;
  return (
    <View style={styles.notesSection}>
      <Text variant="bodyMedium" style={[styles.notes, { color: theme.colors.onSurface }]}>
        {visible}
      </Text>
      {overflow && (
        <Text
          variant="labelSmall"
          onPress={() => setExpanded((v) => !v)}
          style={[styles.notesToggle, { color: theme.colors.primary }]}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Text>
      )}
    </View>
  );
}

function LanguagesChips({ languages }: { languages: string[] }) {
  if (!languages.length) return null;
  return (
    <View style={styles.languagesRow}>
      {languages.map((lang) => (
        <Chip key={lang} compact icon="translate" style={styles.languageChip}>
          {lang}
        </Chip>
      ))}
    </View>
  );
}

export default function PersonHeader({ person, onAvatarPress }: PersonHeaderProps) {
  const theme = useTheme();
  const { data: personPhotos = [] } = usePersonPhotos(person.id);
  const takePhoto = useTakePhoto();
  const setProfilePhoto = useSetProfilePhoto();
  const addPhotoToPerson = useAddPhotoToPerson();

  const isCanceledError = (error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return message.includes('cancelled') || message.includes('canceled');
  };

  // Get the profile photo path
  const profilePhoto = person?.photoId ? personPhotos.find((p) => p.id === person.photoId) : null;

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
            } catch (error) {
              if (!isCanceledError(error)) {
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Failed to take photo'
                );
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
            } catch (error) {
              if (!isCanceledError(error)) {
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Failed to add photo'
                );
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
        <Text
          variant="bodyLarge"
          style={[styles.nickname, { color: theme.colors.onSurfaceVariant }]}
        >
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

      {(person.metDate || person.metLocation) && (
        <Text
          variant="bodySmall"
          style={[styles.metDate, { color: theme.colors.onSurfaceVariant }]}
        >
          {formatMetLine(person.metDate, person.metLocation)}
        </Text>
      )}

      {person.homeLocation && (
        <Text
          variant="bodySmall"
          style={[styles.metDate, { color: theme.colors.onSurfaceVariant }]}
        >
          Lives in {person.homeLocation}
        </Text>
      )}

      <PartnerBadge personId={person.id} />

      <ContactQuickRow
        phone={person.phone}
        email={person.email}
        primaryColor={theme.colors.primary}
      />

      <SocialLinksStrip links={parseSocialLinksJson(person.socialLinks)} />

      <LanguagesChips languages={parseLanguagesJson(person.languages)} />

      {person.notes && <PersonNotes text={person.notes} />}

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
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  contactIcon: {
    margin: 0,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  languageChip: {
    marginRight: 4,
  },
  notesToggle: {
    marginTop: 6,
    fontWeight: '600',
  },
});
