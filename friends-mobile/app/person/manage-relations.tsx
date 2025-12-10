import { StyleSheet, View, Alert, ScrollView } from 'react-native';
import {
  Text,
  List,
  IconButton,
  Divider,
  ActivityIndicator,
  Button,
  Chip,
} from 'react-native-paper';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePersonRelations, useDeleteRelation } from '@/hooks/useRelations';
import { usePerson } from '@/hooks/usePeople';
import { formatRelationType, getRelationEmoji, formatRelativeTime } from '@/lib/utils/format';
import { INTENSITY_OPTIONS } from '@/lib/constants/relations';
import { spacing } from '@/styles/spacing';

// Helper function to get intensity label
const getIntensityLabel = (intensity: string) => {
  const option = INTENSITY_OPTIONS.find((opt) => opt.value === intensity);
  return option ? option.label : intensity;
};

// Priority order for relation types (higher priority = shown first)
const RELATION_TYPE_PRIORITY: Record<string, number> = {
  CARES_FOR: 100,
  DEPENDS_ON: 95,
  STRUGGLES_WITH: 90,
  FEARS: 85,
  WANTS_TO_ACHIEVE: 80,
  IS: 75,
  HAS_SKILL: 70,
  REGULARLY_DOES: 65,
  KNOWS: 60,
  BELIEVES: 55,
  LIKES: 50,
  PREFERS_OVER: 45,
  ASSOCIATED_WITH: 40,
  EXPERIENCED: 35,
  OWNS: 30,
  UNCOMFORTABLE_WITH: 25,
  SENSITIVE_TO: 20,
  DISLIKES: 10,
  USED_TO_BE: 5,
  UNKNOWN: 0,
};

export default function ManageRelationsScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person } = usePerson(personId!);
  const { data: relations = [], isLoading } = usePersonRelations(personId!);
  const deleteRelation = useDeleteRelation();

  const handleDelete = (relationId: string, objectLabel: string) => {
    Alert.alert('Delete Relation', `Are you sure you want to delete "${objectLabel}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRelation.mutateAsync(relationId);
        },
      },
    ]);
  };

  // Group relations by type
  const relationsByType = relations.reduce(
    (acc, relation) => {
      const type = relation.relationType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(relation);
      return acc;
    },
    {} as Record<string, typeof relations>
  );

  // Sort by priority
  const sortedTypes = Object.keys(relationsByType).sort(
    (a, b) => (RELATION_TYPE_PRIORITY[b] || 0) - (RELATION_TYPE_PRIORITY[a] || 0)
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Manage Relations' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${person?.name || 'Person'} - Relations`,
          headerRight: () => (
            <View style={{ marginRight: spacing.xs }}>
              <IconButton
                icon="plus"
                onPress={() => router.push(`/person/add-relation?personId=${personId}`)}
              />
            </View>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        {relations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No relations yet
            </Text>
            <Button
              mode="contained"
              onPress={() => router.push(`/person/add-relation?personId=${personId}`)}
            >
              Add Relation
            </Button>
          </View>
        ) : (
          sortedTypes.map((type) => (
            <View key={type}>
              <List.Subheader style={styles.typeHeader}>
                {getRelationEmoji(type)} {formatRelationType(type)} ({relationsByType[type].length})
              </List.Subheader>
              {relationsByType[type].map((relation) => (
                <List.Item
                  key={relation.id}
                  title={relation.objectLabel}
                  description={
                    <View style={styles.descriptionRow}>
                      {relation.category && (
                        <Chip
                          compact
                          style={styles.categoryChip}
                          textStyle={styles.categoryChipText}
                        >
                          {relation.category}
                        </Chip>
                      )}
                      {relation.intensity && (
                        <Chip
                          compact
                          style={styles.intensityChip}
                          textStyle={styles.intensityChipText}
                        >
                          {getIntensityLabel(relation.intensity)}
                        </Chip>
                      )}
                      <Text variant="bodySmall" style={styles.dateText}>
                        {formatRelativeTime(new Date(relation.createdAt))}
                      </Text>
                    </View>
                  }
                  right={() => (
                    <View style={styles.actions}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() =>
                          router.push(`/person/edit-relation?relationId=${relation.id}`)
                        }
                      />
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        iconColor="#d32f2f"
                        onPress={() => handleDelete(relation.id, relation.objectLabel)}
                      />
                    </View>
                  )}
                  style={styles.listItem}
                />
              ))}
              <Divider />
            </View>
          ))
        )}
        <View style={styles.spacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  typeHeader: {
    backgroundColor: '#e3f2fd',
    fontWeight: 'bold',
  },
  listItem: {
    backgroundColor: 'white',
    paddingVertical: 8,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  categoryChip: {
    marginVertical: 4,
    height: 32,
  },
  categoryChipText: {
    fontSize: 12,
    lineHeight: 20,
  },
  intensityChip: {
    height: 32,
    paddingHorizontal: 8,
  },
  intensityChipText: {
    fontSize: 12,
    lineHeight: 20,
  },
  dateText: {
    opacity: 0.6,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    height: 40,
  },
});
