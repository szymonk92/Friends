import CenteredContainer from '@/components/CenteredContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import {
  View,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Card, Chip, Text, Searchbar, SegmentedButtons, List } from 'react-native-paper';
import { usePeople } from '@/hooks/usePeople';
import { useRelations } from '@/hooks/useRelations';
import { useStories } from '@/hooks/useStories';
import { useConnections } from '@/hooks/useConnections';
import { getInitials, formatRelativeTime, getRelationEmoji } from '@/lib/utils/format';
import { LIKES, DISLIKES } from '@/lib/constants/relations';

type SearchCategory = 'all' | 'people' | 'relations' | 'stories';

interface SearchResult {
  id: string;
  type: 'person' | 'relation' | 'story' | 'connection';
  title: string;
  subtitle: string;
  metadata?: string;
  personId?: string;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');

  const { data: people = [], isLoading: loadingPeople } = usePeople();
  const { data: relations = [], isLoading: loadingRelations } = useRelations();
  const { data: stories = [], isLoading: loadingStories } = useStories();
  const { data: connections = [], isLoading: loadingConnections } = useConnections();

  const isLoading = loadingPeople || loadingRelations || loadingStories || loadingConnections;

  // Get person name by ID
  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person?.name || 'Unknown';
  };

  // Search results with relevance
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search people
    if (category === 'all' || category === 'people') {
      people.forEach((person) => {
        const nameMatch = person.name.toLowerCase().includes(query);
        const nicknameMatch = person.nickname?.toLowerCase().includes(query);
        const notesMatch = person.notes?.toLowerCase().includes(query);

        if (nameMatch || nicknameMatch || notesMatch) {
          results.push({
            id: person.id,
            type: 'person',
            title: person.name,
            subtitle: person.relationshipType || 'No relationship type',
            metadata: person.nickname ? `"${person.nickname}"` : undefined,
            personId: person.id,
          });
        }
      });
    }

    // Search relations (LIKES/DISLIKES/etc.)
    if (category === 'all' || category === 'relations') {
      relations.forEach((relation) => {
        const objectMatch = relation.objectLabel.toLowerCase().includes(query);
        const categoryMatch = relation.category?.toLowerCase().includes(query);
        const typeMatch = relation.relationType.toLowerCase().includes(query);

        if (objectMatch || categoryMatch || typeMatch) {
          const personName = getPersonName(relation.subjectId);
          results.push({
            id: relation.id,
            type: 'relation',
            title: `${personName} ${relation.relationType.replace('_', ' ')} ${relation.objectLabel}`,
            subtitle: relation.category || relation.intensity || 'No category',
            metadata: `${getRelationEmoji(relation.relationType)} ${relation.confidence ? `${Math.round(relation.confidence * 100)}% confidence` : ''}`,
            personId: relation.subjectId,
          });
        }
      });
    }

    // Search stories
    if (category === 'all' || category === 'stories') {
      stories.forEach((story) => {
        const contentMatch = story.content.toLowerCase().includes(query);
        const titleMatch = story.title?.toLowerCase().includes(query);

        if (contentMatch || titleMatch) {
          const preview = story.content.substring(0, 100);
          results.push({
            id: story.id,
            type: 'story',
            title: story.title || 'Untitled Story',
            subtitle: preview + (story.content.length > 100 ? '...' : ''),
            metadata: formatRelativeTime(new Date(story.createdAt)),
          });
        }
      });
    }

    return results;
  }, [searchQuery, category, people, relations, stories]);

  // Group relations by what they like/dislike for summary
  const preferenceSummary = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return null;

    const query = searchQuery.toLowerCase().trim();

    // Find all people who LIKE this thing
    const likes = relations.filter(
      (r) => r.relationType === LIKES && r.objectLabel.toLowerCase().includes(query)
    );

    // Find all people who DISLIKE this thing
    const dislikes = relations.filter(
      (r) => r.relationType === DISLIKES && r.objectLabel.toLowerCase().includes(query)
    );

    if (likes.length === 0 && dislikes.length === 0) return null;

    return {
      likes: likes.map((r) => ({
        personId: r.subjectId,
        personName: getPersonName(r.subjectId),
        item: r.objectLabel,
        intensity: r.intensity,
      })),
      dislikes: dislikes.map((r) => ({
        personId: r.subjectId,
        personName: getPersonName(r.subjectId),
        item: r.objectLabel,
        intensity: r.intensity,
      })),
    };
  }, [searchQuery, relations, people]);

  const handleResultPress = (result: SearchResult) => {
    if (result.type === 'person' && result.personId) {
      router.push(`/person/${result.personId}`);
    } else if (result.type === 'relation' && result.personId) {
      router.push(`/person/${result.personId}`);
    } else if (result.type === 'story') {
      // Navigate to stories tab for now
      router.push('/stories');
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <Card style={styles.resultCard} onPress={() => handleResultPress(item)}>
      <Card.Content>
        <View style={styles.resultHeader}>
          {category === 'all' && (
            <Chip
              style={[
                styles.typeChip,
                item.type === 'person' && styles.personChip,
                item.type === 'relation' && styles.relationChip,
                item.type === 'story' && styles.storyChip,
              ]}
            >
              {item.type}
            </Chip>
          )}
          {item.metadata && (
            <Text variant="labelSmall" style={styles.metadata}>
              {item.metadata}
            </Text>
          )}
        </View>
        <Text variant="titleMedium" style={styles.resultTitle}>
          {item.title}
        </Text>
        <Text variant="bodySmall" style={styles.resultSubtitle} numberOfLines={2}>
          {item.subtitle}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(255, 255, 255, 0.8)" translucent />
      <View style={[styles.statusBarSpacer, { height: insets.top }]} />
      <View style={styles.header}>
        <Searchbar
          placeholder="Search people, preferences, stories..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          autoFocus
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          <Chip
            selected={category === 'all'}
            onPress={() => setCategory('all')}
            style={styles.categoryChip}
            showSelectedOverlay={true}
          >
            All
          </Chip>
          <Chip
            selected={category === 'people'}
            onPress={() => setCategory('people')}
            style={styles.categoryChip}
            showSelectedOverlay={true}
          >
            People
          </Chip>
          <Chip
            selected={category === 'relations'}
            onPress={() => setCategory('relations')}
            style={styles.categoryChip}
            showSelectedOverlay={true}
          >
            Preferences
          </Chip>
          <Chip
            selected={category === 'stories'}
            onPress={() => setCategory('stories')}
            style={styles.categoryChip}
            showSelectedOverlay={true}
          >
            Stories
          </Chip>
        </ScrollView>
      </View>

      {isLoading && (
        <CenteredContainer style={styles.centered}>
          <ActivityIndicator size="large" />
        </CenteredContainer>
      )}

      {!isLoading && searchQuery.length < 2 && (
        <CenteredContainer style={styles.emptyState}>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            Start searching
          </Text>
          <Text variant="bodyMedium" style={styles.emptyDescription}>
            Search for people, preferences (who likes/dislikes what), or story content.
          </Text>
          <Text variant="bodySmall" style={styles.exampleText}>
            Examples: "carrot", "vegan", "hiking", "Sarah"
          </Text>
        </CenteredContainer>
      )}

      {!isLoading && searchQuery.length >= 2 && (
        <>
          {/* Preference Summary Card */}
          {preferenceSummary &&
            (preferenceSummary.likes.length > 0 || preferenceSummary.dislikes.length > 0) && (
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.summaryTitle}>
                    Who likes/dislikes "{searchQuery}"?
                  </Text>

                  {preferenceSummary.likes.length > 0 && (
                    <View style={styles.summarySection}>
                      <Text variant="titleSmall" style={styles.likesTitle}>
                        👍 Likes ({preferenceSummary.likes.length})
                      </Text>
                      {preferenceSummary.likes.map((item, index) => (
                        <TouchableOpacity
                          key={`like-${index}`}
                          onPress={() => router.push(`/person/${item.personId}`)}
                        >
                          <List.Item
                            title={item.personName}
                            description={`${item.item}${item.intensity ? ` (${item.intensity})` : ''}`}
                            left={() => (
                              <View style={styles.summaryAvatar}>
                                <Text style={styles.summaryAvatarText}>
                                  {getInitials(item.personName)}
                                </Text>
                              </View>
                            )}
                            style={styles.summaryItem}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {preferenceSummary.dislikes.length > 0 && (
                    <View style={styles.summarySection}>
                      <Text variant="titleSmall" style={styles.dislikesTitle}>
                        👎 Dislikes ({preferenceSummary.dislikes.length})
                      </Text>
                      {preferenceSummary.dislikes.map((item, index) => (
                        <TouchableOpacity
                          key={`dislike-${index}`}
                          onPress={() => router.push(`/person/${item.personId}`)}
                        >
                          <List.Item
                            title={item.personName}
                            description={`${item.item}${item.intensity ? ` (${item.intensity})` : ''}`}
                            left={() => (
                              <View style={[styles.summaryAvatar, styles.dislikeAvatar]}>
                                <Text style={styles.summaryAvatarText}>
                                  {getInitials(item.personName)}
                                </Text>
                              </View>
                            )}
                            style={styles.summaryItem}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}

          {/* All Results */}
          <View style={styles.resultsHeader}>
            <Text variant="titleSmall">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </Text>
          </View>

          {searchResults.length === 0 ? (
            <View style={styles.noResults}>
              <Text variant="bodyLarge">No results found</Text>
              <Text variant="bodySmall" style={styles.noResultsHint}>
                Try a different search term or category
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderResult}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              contentContainerStyle={styles.resultsList}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBarSpacer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  centered: {},
  header: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    elevation: 2,
  },
  searchbar: {
    marginBottom: 12,
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  categoryChip: {
    marginRight: 8,
  },
  emptyState: {
    padding: 32,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 16,
  },
  exampleText: {
    opacity: 0.5,
    fontStyle: 'italic',
  },
  summaryCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#e8f5e9',
  },
  summaryTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  summarySection: {
    marginBottom: 12,
  },
  likesTitle: {
    color: '#2e7d32',
    marginBottom: 8,
  },
  dislikesTitle: {
    color: '#c62828',
    marginBottom: 8,
  },
  summaryAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dislikeAvatar: {
    backgroundColor: '#e53935',
  },
  summaryAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryItem: {
    paddingVertical: 4,
    backgroundColor: '#fff',
    marginBottom: 4,
    borderRadius: 8,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsList: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  resultCard: {
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeChip: {
    height: 32,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  personChip: {
    backgroundColor: '#e3f2fd',
  },
  relationChip: {
    backgroundColor: '#fff3e0',
  },
  storyChip: {
    backgroundColor: '#f3e5f5',
  },
  metadata: {
    opacity: 0.6,
  },
  resultTitle: {
    marginBottom: 4,
  },
  resultSubtitle: {
    opacity: 0.7,
  },
  noResults: {
    padding: 32,
    alignItems: 'center',
  },
  noResultsHint: {
    marginTop: 8,
    opacity: 0.6,
  },
});
