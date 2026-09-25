import { View, StyleSheet, Image, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getInitials } from '@/lib/utils/format';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { RelationIcon } from '@/components/RelationIcon';
import {
  LIKES,
  DISLIKES,
  AVOIDS,
  CAN,
  DOES,
  WANTS,
  STRONG,
} from '@/lib/constants/relations';

interface Relation {
  id: string;
  relationType: string;
  objectLabel: string;
  intensity?: string | null;
}

interface NetworkPersonDetailsProps {
  person: {
    id: string;
    name: string;
    nickname?: string | null;
    photoPath?: string | null;
    relationshipType?: string | null;
  };
  relations: Relation[];
  connectionCount: number;
}

const SECTION_META = [
  { titleKey: 'network.sections.likes', type: LIKES },
  { titleKey: 'network.sections.dislikes', type: DISLIKES },
  { titleKey: 'network.sections.avoids', type: AVOIDS },
  { titleKey: 'network.sections.skills', type: CAN },
  { titleKey: 'network.sections.activities', type: DOES },
  { titleKey: 'network.sections.goals', type: WANTS },
] as const;

export default function NetworkPersonDetails({
  person,
  relations,
  connectionCount,
}: NetworkPersonDetailsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Header with avatar */}
      <View style={styles.header}>
        {person.photoPath ? (
          <Image source={{ uri: person.photoPath }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={fzText.name}>{person.name}</Text>
          {person.nickname && (
            <Text style={[fzText.sub, { fontStyle: 'italic', marginTop: 2 }]}>
              &ldquo;{person.nickname}&rdquo;
            </Text>
          )}
          <View style={styles.metaRow}>
            {person.relationshipType && (
              <Pill label={person.relationshipType} variant="surface" />
            )}
            <Pill
              label={t('network.connectionCount', { count: connectionCount })}
              variant="soft"
            />
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.contentWrapper}>
        {SECTION_META.map((s) => {
          const items = relations.filter((r) => r.relationType === s.type);
          if (items.length === 0) return null;
          return (
            <View style={styles.section} key={s.titleKey}>
              <View style={styles.sectionHeader}>
                <RelationIcon type={s.type} size={13} color={fz.ink} />
                <Text style={fzText.label}>
                  {t(s.titleKey)} ({items.length})
                </Text>
              </View>
              <View style={styles.chipsContainer}>
                {items.map((item) => {
                  const label =
                    item.objectLabel + (item.intensity === STRONG ? ' +' : '');
                  return <Pill key={item.id} label={label} variant="surface" />;
                })}
              </View>
            </View>
          );
        })}
        {relations.length === 0 && (
          <Text style={[fzText.sub, { fontStyle: 'italic', textAlign: 'center', paddingVertical: 24 }]}>
            {t('network.noDetails')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: fz.s.edge,
    marginTop: fz.s.md,
    marginBottom: fz.s.xxl,
    padding: fz.s.lg,
    backgroundColor: fz.card,
    borderRadius: fz.rCard,
    borderWidth: 1,
    borderColor: fz.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: fz.s.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: fz.s.md,
    backgroundColor: fz.surface,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: fz.s.md,
    backgroundColor: fz.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: fz.paper,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fz.font,
  },
  headerInfo: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: fz.hairline,
    marginVertical: fz.s.md,
  },
  contentWrapper: {},
  section: {
    marginBottom: fz.s.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
});