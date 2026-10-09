import { StyleSheet, View, TouchableOpacity, Linking, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { formatShortDate } from '@/lib/utils/format';
import { tr, relationshipTypeLabel, personTypeLabel, importanceLabel } from '@/lib/i18n/labels';
import { usePersonPhotos } from '@/hooks/usePhotos';
import { usePersonRelations } from '@/hooks/useRelations';
import { activeDietKeys } from '@/lib/constants/relations';
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
import { useTranslation } from 'react-i18next';
import { fzAlert } from '@/lib/utils/confirm';

interface PersonHeaderProps {
  person: Person;
  onAvatarPress: () => void;
}

// geo: lets Android show its maps-app chooser / user default; iOS goes to Apple Maps.
// Web Google Maps is the fallback when no handler is installed.
async function openInMaps(address: string) {
  const q = encodeURIComponent(address);
  const native = Platform.OS === 'ios' ? `maps://?q=${q}` : `geo:0,0?q=${q}`;
  try {
    await Linking.openURL(native);
  } catch {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  }
}

function formatMetLine(metDate: Date | null | undefined, metLocation: string | null | undefined): string {
  const datePart = metDate ? formatShortDate(new Date(metDate)) : '';
  const locationPart = metLocation?.trim() || '';
  if (datePart && locationPart)
    return tr('header.metInOn', `Met in ${locationPart} · ${datePart}`, {
      place: locationPart,
      date: datePart,
    });
  if (locationPart) return tr('header.metIn', `Met in ${locationPart}`, { place: locationPart });
  return tr('header.metOn', `Met ${datePart}`, { date: datePart });
}

function ContactQuickRow({
  phone,
  email,
}: {
  phone: string | null | undefined;
  email: string | null | undefined;
}) {
  const { t } = useTranslation();
  if (!phone && !email) return null;

  const callOrText = async (value: string, scheme: 'tel:' | 'mailto:') => {
    const url = `${scheme}${value}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else fzAlert(scheme === 'tel:' ? t('header.phone') : t('header.email'), value);
    } catch {
      fzAlert(scheme === 'tel:' ? t('header.phone') : t('header.email'), value);
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
  const { t } = useTranslation();
  const { data: personPhotos = [] } = usePersonPhotos(person.id);
  const profilePhoto = person.photoId ? personPhotos.find((p) => p.id === person.photoId) : null;

  const isPet = person.entityType === 'pet';
  const { data: relations = [] } = usePersonRelations(person.id);
  const dietKeys = activeDietKeys(relations);
  const socialLinks = parseSocialLinksJson(person.socialLinks);

  const hasChips =
    person.relationshipType ||
    person.personType ||
    (person.importanceToUser && person.importanceToUser !== 'unknown');

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
                  label={relationshipTypeLabel(person.relationshipType)}
                  variant="solid"
                />
              )}
              {person.personType && (
                <Pill label={personTypeLabel(person.personType)} />
              )}
              {person.importanceToUser && person.importanceToUser !== 'unknown' && (
                <Pill
                  label={importanceLabel(person.importanceToUser)}
                />
              )}
            </View>
          )}

          {isPet && (
            <View style={styles.chips}>
              <Pill label={`🐾 ${person.species?.trim() || t('header.pet')}`} variant="solid" />
            </View>
          )}

          {!isPet && person.homeLocation && (
            <TouchableOpacity
              style={styles.homeRow}
              onPress={() => openInMaps(person.homeLocation!)}
              accessibilityRole="link"
              activeOpacity={0.6}
            >
              <LineIcon name="home" size={15} color={fz.textMute} />
              <Text style={styles.homeText} numberOfLines={2}>
                {person.homeLocation}
              </Text>
            </TouchableOpacity>
          )}

          {!isPet && (person.metDate || person.metLocation) && (
            <Text style={styles.metaLine}>{formatMetLine(person.metDate, person.metLocation)}</Text>
          )}
        </View>
      </View>

      {!isPet && (
        <PartnerBadge personId={person.id} />
      )}

      {!isPet && dietKeys.length > 0 && (
        <View style={styles.languagesRow}>
          {dietKeys.map((k) => (
            <Pill key={k} label={t(`person.diet.${k}`)} variant="outline" />
          ))}
        </View>
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
    paddingBottom: fz.s.xs,
    alignItems: 'stretch',
    // One rhythm between identity, partner, contacts and languages rows.
    gap: fz.s.sm,
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
  homeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: fz.s.sm,
  },
  homeText: {
    ...fzText.sub,
    flexShrink: 1,
  },
  metaLine: {
    ...fzText.sub,
    marginTop: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: fz.s.sm,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: fz.s.xs,
  },
});