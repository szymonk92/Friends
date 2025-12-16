import { View, StyleSheet, Image } from 'react-native';
import { Text, Card, Chip, Divider, useTheme } from 'react-native-paper';
import { getInitials } from '@/lib/utils/format';
import {
  LIKES,
  DISLIKES,
  HAS_SKILL,
  REGULARLY_DOES,
  PREFERS_OVER,
  FEARS,
  WANTS_TO_ACHIEVE,
  VERY_STRONG,
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
  relationshipColor: string;
  connectionCount: number;
}

export default function NetworkPersonDetails({
  person,
  relations,
  relationshipColor,
  connectionCount,
}: NetworkPersonDetailsProps) {
  const theme = useTheme();

  // Group relations by category
  const groupedRelations = {
    likes: relations.filter((r) => r.relationType === LIKES),
    dislikes: relations.filter((r) => r.relationType === DISLIKES),
    skills: relations.filter((r) => r.relationType === HAS_SKILL),
    activities: relations.filter((r) => r.relationType === REGULARLY_DOES),
    preferences: relations.filter((r) => r.relationType === PREFERS_OVER),
    fears: relations.filter((r) => r.relationType === FEARS),
    goals: relations.filter((r) => r.relationType === WANTS_TO_ACHIEVE),
  };

  const renderSection = (title: string, icon: string, items: Relation[], color: string) => {
    if (!items || items.length === 0) return null;

    return (
      <View style={styles.section} key={title}>
        <View style={styles.sectionHeader}>
          <Text
            variant="labelLarge"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            {icon} {title}
          </Text>
        </View>
        <View style={styles.chipsContainer}>
          {items.map((item) => (
            <Chip
              key={item.id}
              compact
              style={[styles.chip, { backgroundColor: `${color}15` }]}
              textStyle={{ color: color, fontSize: 12 }}
            >
              {item.objectLabel}
              {item.intensity === VERY_STRONG && ' 💪'}
              {item.intensity === STRONG && ' +'}
            </Chip>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Card style={styles.container} mode="elevated">
      <Card.Content>
        {/* Header with avatar */}
        <View style={styles.header}>
          {person.photoPath ? (
            <Image source={{ uri: person.photoPath }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: relationshipColor }]}>
              <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text variant="titleLarge" style={styles.name}>
              {person.name}
            </Text>
            {person.nickname && (
              <Text variant="bodyMedium" style={styles.nickname}>
                "{person.nickname}"
              </Text>
            )}
            <View style={styles.metaRow}>
              {person.relationshipType && (
                <Chip
                  compact
                  style={[styles.typeChip, { backgroundColor: `${relationshipColor}20` }]}
                  textStyle={{ color: relationshipColor }}
                >
                  {person.relationshipType}
                </Chip>
              )}
              <Chip compact icon="account-network" style={styles.connectionChip}>
                {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
              </Chip>
            </View>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Content - Just Views, relying on Parent ScrollView */}
        <View style={styles.contentWrapper}>
          {renderSection('Likes', '❤️', groupedRelations.likes, '#4caf50')}
          {renderSection('Dislikes', '👎', groupedRelations.dislikes, '#f44336')}
          {renderSection('Skills', '🎯', groupedRelations.skills, '#2196f3')}
          {renderSection('Activities', '🏃', groupedRelations.activities, '#ff9800')}
          {renderSection('Prefers', '⭐', groupedRelations.preferences, '#9c27b0')}
          {renderSection('Fears', '😰', groupedRelations.fears, '#ff5722')}
          {renderSection('Goals', '🏆', groupedRelations.goals, '#009688')}

          {relations.length === 0 && (
            <View style={styles.emptyState}>
              <Text variant="bodyMedium" style={styles.emptyText}>
                No detailed information available yet.
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32, // Extra space at bottom for scrolling
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    backgroundColor: '#eee',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontWeight: '700',
    marginBottom: 2,
  },
  nickname: {
    opacity: 0.6,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeChip: {
    height: 26,
  },
  connectionChip: {
    height: 26,
    backgroundColor: '#f5f5f5',
  },
  divider: {
    marginVertical: 12,
  },
  contentWrapper: {
    // No fixed height, let it grow
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 28,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.5,
    fontStyle: 'italic',
  },
});
