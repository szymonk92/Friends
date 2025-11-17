import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Card, FAB, Searchbar, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { getInitials, formatRelativeTime, getImportanceColor } from '@/lib/utils/format';

export default function PeopleListScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [people, setPeople] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize with empty data for MVP
    setTimeout(() => {
      setIsLoading(false);
      setPeople([]);
    }, 500);
  }, []);

  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const refetch = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setIsLoading(false);
      setPeople([]);
    }, 500);
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
