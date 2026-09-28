import { StyleSheet, View, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { formatShortDate } from '@/lib/utils/format';
import { usePersonPhotos } from '@/hooks/usePhotos';
import type { Person } from '@/lib/db/schema';
import SocialLinksStrip from './SocialLinksStrip';
import PartnerBadge from './PartnerBadge';
import { parseSocialLinksJson } from '@/lib/social/socialLinks';
import { parseLanguagesJson } from '@/lib/utils/languages';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { IconCircle } from '@/components/IconCircle';
import { LineIcon } from '@/components/LineIcon';
import { Avatar } from '@/components/Avatar';

interface PersonHeaderProps {
  person: Person;
  onAvatarPress: () => void;
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
    <>
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
    </>
  );
}

export default function PersonHeader({ person, onAvatarPress }: PersonHeaderProps) {
  const { data: personPhotos = [] } = usePersonPhotos(person.id);
  const profilePhoto = person.photoId ? personPhotos.find((p) => p.id === person.photoId) : null;

  const isPet = person.entityType === 'pet';
  const socialLinks = parseSocialLinksJson(person.socialLinks);

  const hasChips =
    person.relationshipType ||
    person.personType ||
    (person.importanceToUser && person.importanceToUser !== 'unknown') ||
    person.homeLocation;

  return (
    <View style={styles.headerSection}>
      <View style={styles.identityRow}>
        <TouchableOpacity onPress={onAvatarPress} style={styles.avatarContainer} activeOpacity={0.8}>
          <Avatar name={person.name} photoPath={profilePhoto?.filePath} size={84} variant="ink" />
          <View style={styles.avatarBadge}>
            <LineIcon name="camera" size={12} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.identityInfo}>
          <View style={styles.nameLine}>
            <Text style={fzText.title}>{person.name}</Text>
            {person.nickname && <Text style={styles.nickname}>"{person.nickname}"</Text>}
          </View>

          {!isPet && hasChips && (
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
          )}

          {isPet && (
            <View style={styles.chips}>
              <Pill label={`🐾 ${person.species?.trim() || 'Pet'}`} variant="solid" />
            </View>
          )}

          {!isPet && (person.metDate || person.metLocation) && (
            <Text style={styles.metaLine}>{formatMetLine(person.metDate, person.metLocation)}</Text>
          )}
        </View>
      </View>

      {!isPet && (
        <PartnerBadge
          personId={person.id}
          isOwnerPartner={person.relationshipType === 'partner'}
        />
      )}

      {!isPet && (person.phone || person.email || socialLinks.length > 0) && (
        <View style={styles.contactRow}>
          <ContactQuickRow phone={person.phone} email={person.email} />
          <SocialLinksStrip links={socialLinks} />
        </View>
      )}

      {!isPet && parseLanguagesJson(person.languages).length > 0 && (
        <View style={styles.languagesRow}>
          {parseLanguagesJson(person.languages).map((lang) => (
            <Pill key={lang} label={lang} variant="soft" />
          ))}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingHorizontal: fz.s.edge,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'stretch',
    backgroundColor: fz.paper,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  identityInfo: {
    flex: 1,
  },
  nameLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 6,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: fz.ink,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: fz.paper,
  },
  nickname: {
    ...fzText.sub,
    fontStyle: 'italic',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  metaLine: {
    ...fzText.sub,
    marginTop: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
});