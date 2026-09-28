import { StyleSheet, View, ScrollView, ActivityIndicator, StatusBar, Text as RNText, TouchableOpacity } from 'react-native';
import { confirmDestructive } from '@/lib/utils/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePersonRelations, useDeleteRelation } from '@/hooks/useRelations';
import { usePerson } from '@/hooks/usePeople';
import { formatRelationType, formatRelativeTime } from '@/lib/utils/format';
import { INTENSITY_OPTIONS, TYPES_WITHOUT_INTENSITY } from '@/lib/constants/relations';
import { RelationIcon } from '@/components/RelationIcon';
import { fz, fzText } from '@/lib/design/tokens';
import { HeaderBack } from '@/components/HeaderBack';
import { IconCircle } from '@/components/IconCircle';
import { Pill } from '@/components/Pill';

// Helper function to get intensity label
const getIntensityLabel = (intensity: string) => {
  const option = INTENSITY_OPTIONS.find((opt) => opt.value === intensity);
  return option ? option.label : intensity;
};

// Priority order for relation types (higher priority = shown first)
const RELATION_TYPE_PRIORITY: Record<string, number> = {
  STRUGGLES_WITH: 100,
  AVOIDS: 95,
  WANTS: 90,
  LIVES_IN: 85,
  IS: 80,
  CAN: 75,
  DOES: 70,
  KNOWS: 65,
  LIKES: 60,
  HAS: 55,
  DID: 50,
  DISLIKES: 45,
  HAS_IMPORTANT_DATE: 40,
};

export default function ManageRelationsScreen() {
  const insets = useSafeAreaInsets();
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person } = usePerson(personId!);
  const { data: relations = [], isLoading } = usePersonRelations(personId!);
  const deleteRelation = useDeleteRelation();

  const handleDelete = (relationId: string, objectLabel: string) => {
    confirmDestructive({
      title: 'Delete Relation',
      message: `Are you sure you want to delete "${objectLabel}"?`,
      onConfirm: () => deleteRelation.mutateAsync(relationId),
    });
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

  const AppBar = () => (
    <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
      <View style={styles.appBarRow}>
        <HeaderBack onPress={() => router.back()} />
        <RNText style={fzText.screenTitle} numberOfLines={1}>
          {person?.name ? `${person.name} · Relations` : 'Relations'}
        </RNText>
        <IconCircle
          icon="plus"
          onPress={() => router.push(`/person/add-relation?personId=${personId}`)}
        />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <AppBar />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fz.ink} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
      <AppBar />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        {relations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <RNText style={[fzText.sub, { marginBottom: fz.s.lg }]}>No relations yet</RNText>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push(`/person/add-relation?personId=${personId}`)}
              activeOpacity={0.8}
            >
              <RNText style={fzText.btn}>Add Relation</RNText>
            </TouchableOpacity>
          </View>
        ) : (
          sortedTypes.map((type) => (
            <View key={type} style={styles.typeGroup}>
              <View style={styles.typeHeader}>
                <RelationIcon type={type} size={14} />
                <RNText style={styles.typeHeaderText}>
                  {formatRelationType(type)} ({relationsByType[type].length})
                </RNText>
              </View>
              {relationsByType[type].map((relation) => (
                <View key={relation.id} style={styles.relationCard}>
                  <View style={styles.relationMain}>
                    <RNText style={fzText.name} numberOfLines={2}>
                      {relation.objectLabel}
                    </RNText>
                    <View style={styles.descriptionRow}>
                      {relation.category && <Pill label={relation.category} variant="soft" />}
                      {relation.intensity &&
                        !TYPES_WITHOUT_INTENSITY.includes(relation.relationType) && (
                          <Pill label={getIntensityLabel(relation.intensity)} variant="outline" />
                        )}
                      <RNText style={styles.dateText}>
                        {formatRelativeTime(new Date(relation.createdAt))}
                      </RNText>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <IconCircle
                      icon="pencil"
                      size={32}
                      iconSize={15}
                      onPress={() =>
                        router.push(`/person/edit-relation?relationId=${relation.id}`)
                      }
                    />
                    <IconCircle
                      icon="trash"
                      size={32}
                      iconSize={15}
                      onPress={() => handleDelete(relation.id, relation.objectLabel)}
                    />
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  appBar: { backgroundColor: fz.paper, paddingBottom: fz.s.sm },
  appBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: fz.s.edge,
    paddingBottom: fz.s.sm,
  },
  scroll: { flex: 1 },
  scrollInner: { paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 32, alignItems: 'center' },
  primaryBtn: {
    backgroundColor: fz.ink,
    height: 48,
    borderRadius: fz.rButton,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeGroup: { marginBottom: fz.s.md },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: fz.s.edge,
    paddingVertical: fz.s.md,
  },
  typeHeaderText: { ...fzText.label },
  relationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: fz.card,
    borderRadius: fz.rRow,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    padding: fz.s.md,
    marginHorizontal: fz.s.edge,
    marginBottom: fz.s.sm,
  },
  relationMain: { flex: 1, marginRight: fz.s.sm },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: fz.s.xs,
    flexWrap: 'wrap',
  },
  dateText: { ...fzText.time, marginLeft: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});