import { StyleSheet, View, Pressable } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { useState } from 'react';
import { usePersonRelations } from '@/hooks/useRelations';
import { formatRelationType } from '@/lib/utils/format';
import { WEAK, MEDIUM, STRONG, TYPES_WITHOUT_INTENSITY } from '@/lib/constants/relations';
import { ProfileSection } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { RelationIcon } from '@/components/RelationIcon';
import { fz, fzText } from '@/lib/design/tokens';

// Priority order for relation types (higher priority = shown first)
const RELATION_TYPE_PRIORITY: Record<string, number> = {
  STRUGGLES_WITH: 100, AVOIDS: 95, WANTS: 90, LIVES_IN: 85,
  IS: 80, CAN: 75, DOES: 70, KNOWS: 65,
  LIKES: 60, HAS: 55, DID: 50, DISLIKES: 45,
  HAS_IMPORTANT_DATE: 40,
};

interface PersonRelationsProps {
  personId: string;
  personName: string;
}

export default function PersonRelations({ personId, personName }: PersonRelationsProps) {
  const { data: personRelations, isLoading: relationsLoading } = usePersonRelations(personId);

  const relationsByType = personRelations?.reduce(
    (acc, relation) => {
      const type = relation.relationType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(relation);
      return acc;
    },
    {} as Record<string, typeof personRelations>
  );

  const sortedRelationTypes = relationsByType
    ? Object.keys(relationsByType).sort(
        (a, b) => (RELATION_TYPE_PRIORITY[b] || 0) - (RELATION_TYPE_PRIORITY[a] || 0)
      )
    : [];

  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const toggleType = (type: string) =>
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));

  return (
    <ProfileSection
      label="What they're into"
      count={personRelations?.length || 0}
      onAdd={() => router.push(`/person/add-relation?personId=${personId}`)}
      onMore={() => router.push(`/person/manage-relations?personId=${personId}`)}
    >
      {relationsLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={fz.ink} />
        </View>
      )}

      {!relationsLoading && personRelations && personRelations.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Nothing yet. Add likes, fears, or facts about {personName}.
          </Text>
          <Button
            mode="outlined"
            textColor={fz.ink}
            style={styles.emptyButton}
            onPress={() => router.push(`/person/add-relation?personId=${personId}`)}
          >
            Add Something
          </Button>
        </View>
      )}

      {sortedRelationTypes.map((type) => {
        const rels = relationsByType![type];
        const expanded = expandedTypes[type] ?? false;
        return (
          <View key={type} style={styles.relationTypeSection}>
            <Pressable
              style={styles.relationTypeHeader}
              onPress={() => toggleType(type)}
              hitSlop={8}
            >
              <View style={styles.relationTypeLabelRow}>
                <RelationIcon type={type} size={13} color={fz.ink} />
                <Text style={fzText.label}>
                  {formatRelationType(type)} · {rels.length}
                </Text>
              </View>
              <Text style={styles.chevron}>{expanded ? '︿' : '﹀'}</Text>
            </Pressable>
            {expanded && (
              <View style={styles.chipsContainer}>
                {rels.map((relation) => {
                  const intensitySuffix =
                    relation.intensity &&
                    relation.intensity !== MEDIUM &&
                    !TYPES_WITHOUT_INTENSITY.includes(type)
                      ? relation.intensity === STRONG
                        ? ' +'
                        : relation.intensity === WEAK
                          ? ' −'
                          : ''
                      : '';
                  return (
                    <Pill key={relation.id} label={`${relation.objectLabel}${intensitySuffix}`} variant="surface" />
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  centered: { padding: 12, alignItems: 'center' },
  emptyState: { paddingVertical: 10, alignItems: 'center' },
  emptyText: {
    ...fzText.sub,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyButton: { borderColor: fz.outline },
  relationTypeSection: { marginBottom: 14 },
  relationTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  relationTypeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevron: {
    ...fzText.sub,
    fontSize: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
});