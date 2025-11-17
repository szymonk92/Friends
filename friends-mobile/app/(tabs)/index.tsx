import { StyleSheet, View, FlatList, ScrollView } from 'react-native';
import { Text, Card, FAB, Searchbar, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { useState } from 'react';
import { router } from 'expo-router';
import { getInitials, formatRelativeTime, getImportanceColor } from '@/lib/utils/format';
import { usePeople } from '@/hooks/usePeople';
import { useAllTags, parseTags } from '@/hooks/useTags';

export default function PeopleListScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { data: people = [], isLoading, error, refetch } = usePeople();
  const { data: allTags = [] } = useAllTags();

  const filteredPeople = people.filter((person) => {
    // Filter by search query
    const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by selected tags (person must have ALL selected tags)
    const personTags = parseTags(person.tags);
    const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => personTags.includes(tag));

    return matchesSearch && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
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

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <View style={styles.tagFilterContainer}>
          <View style={styles.tagFilterHeader}>
            <Text variant="labelMedium" style={styles.tagFilterLabel}>
              Filter by tags:
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
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => router.push(`/person/${item.id}`)}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                </View>
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
