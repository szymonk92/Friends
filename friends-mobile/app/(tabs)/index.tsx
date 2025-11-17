import { StyleSheet, View, FlatList, ScrollView, RefreshControl, Image } from 'react-native';
import { Text, Card, FAB, Searchbar, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { getInitials, formatRelativeTime, getImportanceColor } from '@/lib/utils/format';
import { usePeople } from '@/hooks/usePeople';
import { useAllTags, parseTags } from '@/hooks/useTags';

export default function PeopleListScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'importance'>('date');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: people = [], isLoading, error, refetch } = usePeople();

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);
  const { data: allTags = [] } = useAllTags();

  // Get unique relationship types from people
  const relationshipTypes = Array.from(new Set(people.map((p) => p.relationshipType).filter(Boolean))).sort();

  const filteredPeople = people
    .filter((person) => {
      // Filter by search query
      const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by selected tags (person must have ALL selected tags)
      const personTags = parseTags(person.tags);
      const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => personTags.includes(tag));

      // Filter by relationship type
      const matchesRelationType =
        selectedRelationTypes.length === 0 ||
        (person.relationshipType && selectedRelationTypes.includes(person.relationshipType));

      return matchesSearch && matchesTags && matchesRelationType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'importance': {
          const importanceOrder = ['critical', 'very_important', 'important', 'moderate', 'low', 'unknown'];
          const aIndex = importanceOrder.indexOf(a.importanceToUser || 'unknown');
          const bIndex = importanceOrder.indexOf(b.importanceToUser || 'unknown');
          return aIndex - bIndex;
        }
        case 'date':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleRelationType = (type: string) => {
    setSelectedRelationTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedRelationTypes([]);
    setSearchQuery('');
  };

  const clearTagFilters = () => {
    setSelectedTags([]);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading people...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error loading people</Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search people..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Sort and Filter Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.sortRow}>
          <Text variant="labelMedium" style={styles.sortLabel}>
            Sort by:
          </Text>
          <Chip
            selected={sortBy === 'date'}
            onPress={() => setSortBy('date')}
            style={styles.sortChip}
            compact
          >
            Recent
          </Chip>
          <Chip
            selected={sortBy === 'name'}
            onPress={() => setSortBy('name')}
            style={styles.sortChip}
            compact
          >
            Name
          </Chip>
          <Chip
            selected={sortBy === 'importance'}
            onPress={() => setSortBy('importance')}
            style={styles.sortChip}
            compact
          >
            Importance
          </Chip>
        </View>

        <Text variant="bodySmall" style={styles.resultCount}>
          Showing {filteredPeople.length} of {people.length} people
          {(selectedTags.length > 0 || selectedRelationTypes.length > 0) && (
            <Text onPress={clearAllFilters} style={styles.clearAllLink}>
              {' '}
              (Clear filters)
            </Text>
          )}
        </Text>
      </View>

      {/* Relationship Type Filters */}
      {relationshipTypes.length > 0 && (
        <View style={styles.tagFilterContainer}>
          <View style={styles.tagFilterHeader}>
            <Text variant="labelMedium" style={styles.tagFilterLabel}>
              Relationship type:
            </Text>
            {selectedRelationTypes.length > 0 && (
              <Button compact mode="text" onPress={() => setSelectedRelationTypes([])}>
                Clear
              </Button>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
            {relationshipTypes.map((type) => (
              <Chip
                key={type}
                selected={selectedRelationTypes.includes(type)}
                onPress={() => toggleRelationType(type)}
                style={styles.filterChip}
                mode={selectedRelationTypes.includes(type) ? 'flat' : 'outlined'}
                icon={selectedRelationTypes.includes(type) ? 'check' : 'heart'}
              >
                {type}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <View style={styles.tagFilterContainer}>
          <View style={styles.tagFilterHeader}>
            <Text variant="labelMedium" style={styles.tagFilterLabel}>
              Tags:
            </Text>
            {selectedTags.length > 0 && (
              <Button compact mode="text" onPress={clearTagFilters}>
                Clear
              </Button>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
            {allTags.map((tag) => (
              <Chip
                key={tag}
                selected={selectedTags.includes(tag)}
                onPress={() => toggleTag(tag)}
                style={styles.filterChip}
                mode={selectedTags.includes(tag) ? 'flat' : 'outlined'}
                icon={selectedTags.includes(tag) ? 'check' : 'tag'}
              >
                {tag}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {filteredPeople && filteredPeople.length === 0 && (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No people yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Add your first story to get started!
          </Text>
          <Button
            mode="contained"
            onPress={() => router.push('/(tabs)/two')}
            style={styles.emptyButton}
          >
            Add a Story
          </Button>
        </View>
      )}

      <FlatList
        data={filteredPeople}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#6200ee']} />
        }
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => router.push(`/person/${item.id}`)}>
            <Card.Content>
              <View style={styles.cardHeader}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <Text variant="titleMedium" style={styles.name}>
                    {item.name}
                  </Text>
                  {item.nickname && (
                    <Text variant="bodySmall" style={styles.nickname}>
                      "{item.nickname}"
                    </Text>
                  )}
                  <Text variant="bodySmall" style={styles.meta}>
                    Updated {formatRelativeTime(new Date(item.updatedAt))}
                  </Text>
                </View>
              </View>

              <View style={styles.chips}>
                {item.relationshipType && (
                  <Chip icon="heart" style={styles.chip}>
                    {item.relationshipType}
                  </Chip>
                )}
                {item.importanceToUser && item.importanceToUser !== 'unknown' && (
                  <Chip
                    style={[
                      styles.chip,
                      { backgroundColor: getImportanceColor(item.importanceToUser) + '20' },
                    ]}
                  >
                    {item.importanceToUser.replace('_', ' ')}
                  </Chip>
                )}
                {parseTags(item.tags).map((tag) => (
                  <Chip key={tag} icon="tag" style={styles.tagChip} compact>
                    {tag}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
      />

      <FAB
        icon="account-plus"
        style={styles.fab}
        onPress={() => router.push('/modal')}
        label="Add Person"
      />
    </View>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    marginBottom: 16,
    color: '#d32f2f',
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sortLabel: {
    opacity: 0.7,
    marginRight: 8,
  },
  sortChip: {
    marginRight: 6,
  },
  resultCount: {
    opacity: 0.6,
    marginBottom: 4,
  },
  clearAllLink: {
    color: '#6200ee',
    fontWeight: '500',
  },
  tagFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tagFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagFilterLabel: {
    opacity: 0.7,
  },
  tagScroll: {
    flexGrow: 0,
  },
  filterChip: {
    marginRight: 8,
  },
  tagChip: {
    backgroundColor: '#e0e0e0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyButton: {
    marginTop: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
  },
  nickname: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
  meta: {
    opacity: 0.6,
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
