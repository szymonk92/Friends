import React from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Text, Card, Chip, Divider } from 'react-native-paper';
import { getInitials } from '@/lib/utils/format';

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
  // Group relations by category
  const likes = relations.filter((r) => r.relationType === 'LIKES');
  const dislikes = relations.filter((r) => r.relationType === 'DISLIKES');
  const skills = relations.filter((r) => r.relationType === 'HAS_SKILL');
  const activities = relations.filter((r) => r.relationType === 'REGULARLY_DOES');
  const preferences = relations.filter((r) => r.relationType === 'PREFERS_OVER');
  const fears = relations.filter((r) => r.relationType === 'FEARS');
  const goals = relations.filter((r) => r.relationType === 'WANTS_TO_ACHIEVE');

  const renderSection = (title: string, icon: string, items: Relation[], color: string) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            {icon} {title}
          </Text>
        </View>
        <View style={styles.chipsContainer}>
          {items.map((item) => (
            <Chip
              key={item.id}
              compact
              style={[styles.chip, { backgroundColor: `${color}15` }]}
              textStyle={{ color }}
            >
              {item.objectLabel}
              {item.intensity === 'very_strong' && ' 💪'}
              {item.intensity === 'strong' && ' +'}
            </Chip>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Card style={styles.container}>
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
              <Chip compact icon="link-variant" style={styles.connectionChip}>
                {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
              </Chip>
            </View>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Scrollable content */}
        <ScrollView style={styles.scrollContent} nestedScrollEnabled>
          {renderSection('Likes', '❤️', likes, '#4caf50')}
          {renderSection('Dislikes', '👎', dislikes, '#f44336')}
          {renderSection('Skills', '🎯', skills, '#2196f3')}
          {renderSection('Activities', '🏃', activities, '#ff9800')}
          {renderSection('Prefers', '⭐', preferences, '#9c27b0')}
          {renderSection('Fears', '😰', fears, '#ff5722')}
          {renderSection('Goals', '🎯', goals, '#009688')}

          {relations.length === 0 && (
            <View style={styles.emptyState}>
              <Text variant="bodyMedium" style={styles.emptyText}>
                No detailed information available yet.
              </Text>
            </View>
          )}
        </ScrollView>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    maxHeight: 400,
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
    fontWeight: '600',
    marginBottom: 4,
  },
  nickname: {
    opacity: 0.7,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeChip: {
    height: 28,
  },
  connectionChip: {
    height: 28,
    backgroundColor: '#f5f5f5',
  },
  divider: {
    marginVertical: 12,
  },
  scrollContent: {
    maxHeight: 250,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    height: 28,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
  },
});
