import { StyleSheet, View, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { useState } from 'react';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
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
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { IconCircle } from '@/components/IconCircle';
import { LineIcon } from '@/components/LineIcon';
import { ChainLogo } from '@/components/ChainLogo';

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
}: {
  phone: string | null | undefined;
  email: string | null | undefined;
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

  return (
    <View style={styles.contactRow}>
      {phone && (
        <IconCircle
          icon="phone"
          size={40}
          iconSize={18}
          onPress={() => callOrText(phone, 'tel:')}
        />
      )}
      {email && (
        <IconCircle
          icon="email"
          size={40}
          iconSize={18}
          onPress={() => callOrText(email, 'mailto:')}
        />
      )}
    </View>
  );
}

const NOTES_PREVIEW_CHARS = 220;

function PersonNotes({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const overflow = text.length > NOTES_PREVIEW_CHARS;
  const visible = !overflow || expanded ? text : `${text.slice(0, NOTES_PREVIEW_CHARS).trimEnd()}…`;
  return (
    <View style={styles.notesSection}>
      <Text style={fzText.body}>{visible}</Text>
      {overflow && (
        <Text
          style={styles.notesToggle}
          onPress={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Text>
      )}
    </View>
  );
}

export default function PersonHeader({ person, onAvatarPress }: PersonHeaderProps) {
  const { data: personPhotos = [] } = usePersonPhotos(person.id);
  const takePhoto = useTakePhoto();
  const setProfilePhoto = useSetProfilePhoto();
  const addPhotoToPerson = useAddPhotoToPerson();

  const isCanceledError = (error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return message.includes('cancelled') || message.includes('canceled');
  };

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
    <View style={styles.headerSection}>
      <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarContainer} activeOpacity={0.8}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto.filePath }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
          </View>
        )}
        <View style={styles.avatarBadge}>
          <LineIcon name="camera" size={15} color="#fff" />
        </View>
      </TouchableOpacity>

      <Text style={fzText.titleLg}>{person.name}</Text>

      {person.nickname && <Text style={styles.nickname}>"{person.nickname}"</Text>}

      <View style={styles.chips}>
        {person.relationshipType && (
          <Pill
            label={person.relationshipType.charAt(0).toUpperCase() + person.relationshipType.slice(1)}
            variant="solid"
          />
        )}
        {person.personType && (
          <Pill label={person.personType.charAt(0).toUpperCase() + person.personType.slice(1)} />
        )}
        {person.importanceToUser && person.importanceToUser !== 'unknown' && (
          <Pill
            label={person.importanceToUser
              .replace('_', ' ')
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          />
        )}
        {person.homeLocation && <Pill label={person.homeLocation} />}
      </View>

      {(person.metDate || person.metLocation) && (
        <Text style={styles.metaLine}>{formatMetLine(person.metDate, person.metLocation)}</Text>
      )}
      {person.homeLocation && <Text style={styles.metaLine}>Lives in {person.homeLocation}</Text>}

      {person.personType !== 'self' && (
        <View style={styles.relationshipActions}>
          <TouchableOpacity
            style={styles.relationshipRow}
            activeOpacity={0.7}
            onPress={() => router.push(`/person/relationship?personId=${person.id}`)}
          >
            <ChainLogo size={20} strokeWidth={7} color={fz.ink} />
            <Text style={styles.relationshipText}>View relationship</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.relationshipRow}
            activeOpacity={0.7}
            onPress={() => router.push(`/person/compare-picker?personId=${person.id}`)}
          >
            <LineIcon name="users" size={18} color={fz.ink} />
            <Text style={styles.relationshipText}>Compare with…</Text>
          </TouchableOpacity>
        </View>
      )}

      <PartnerBadge
        personId={person.id}
        isOwnerPartner={person.relationshipType === 'partner'}
      />

      <ContactQuickRow phone={person.phone} email={person.email} />

      <SocialLinksStrip links={parseSocialLinksJson(person.socialLinks)} />

      {parseLanguagesJson(person.languages).length > 0 && (
        <View style={styles.languagesRow}>
          {parseLanguagesJson(person.languages).map((lang) => (
            <Pill key={lang} label={lang} variant="soft" />
          ))}
        </View>
      )}

      {person.notes && <PersonNotes text={person.notes} />}

      <Text style={styles.meta}>
        Last updated {formatRelativeTime(new Date(person.updatedAt))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingHorizontal: fz.s.edge,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    backgroundColor: fz.paper,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 18,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: fz.ink,
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
    fontFamily: fz.font,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: fz.ink,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: fz.paper,
  },
  nickname: {
    ...fzText.sub,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  metaLine: {
    ...fzText.sub,
    marginTop: 6,
    textAlign: 'center',
  },
  relationshipActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  relationshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: fz.rPill,
    backgroundColor: fz.surface,
  },
  relationshipText: {
    fontFamily: fz.font,
    fontWeight: '500',
    fontSize: 13,
    color: fz.ink,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    gap: 10,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  notesSection: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  notesToggle: {
    marginTop: 6,
    fontWeight: '600',
    fontFamily: fz.font,
    fontSize: 13,
    color: fz.ink,
  },
  meta: {
    ...fzText.time,
    marginTop: 14,
  },
});