import { StyleSheet, View, FlatList, Alert, StatusBar } from 'react-native';
import { Text, Card, FAB, Searchbar, ActivityIndicator, Button, Chip, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { useStories, useDeleteStory } from '@/hooks/useStories';
import { formatRelativeTime } from '@/lib/utils/format';
import { headerStyles, HEADER_ICON_SIZE } from '@/lib/styles/headerStyles';

export default function StoriesListScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const { data: stories = [], isLoading, error, refetch } = useStories();
  const deleteStory = useDeleteStory();

  const filteredStories = stories.filter((story) =>
    story.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteStory = (storyId: string, aiProcessed: boolean) => {
    const message = aiProcessed
      ? 'Are you sure you want to delete this story?\n\nNote: Any people, relations, or information extracted from this story will NOT be deleted. Only the story text itself will be removed.'
      : 'Are you sure you want to delete this story?';

    Alert.alert('Delete Story', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStory.mutateAsync(storyId);
            Alert.alert('Success', 'Story deleted successfully');
          } catch (err) {
            Alert.alert('Error', 'Failed to delete story. Please try again.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading stories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge" style={styles.errorText}>
          Failed to load stories
        </Text>
        <Button mode="contained" onPress={() => refetch()} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  const renderStoryItem = ({ item }: { item: any }) => {
    const wordCount = item.content.trim().split(/\s+/).filter(Boolean).length;
    const preview = item.content.length > 200 ? item.content.substring(0, 200) + '...' : item.content;

    return (
      <Card
        style={styles.storyCard}
        onPress={() => router.push(`/story/${item.id}`)}
        onLongPress={() => handleDeleteStory(item.id, item.aiProcessed)}
      >
        <Card.Content>
          <View style={styles.storyHeader}>
            <Text variant="labelSmall" style={styles.storyDate}>
              {formatRelativeTime(new Date(item.createdAt))}
            </Text>
            <View style={styles.chips}>
              {item.aiProcessed && (
                <Chip icon="robot" compact style={styles.aiChip}>
                  AI Processed
                </Chip>
              )}
              <Chip compact style={styles.wordChip}>
                {wordCount} words
              </Chip>
            </View>
          </View>

          {item.title && (
            <Text variant="titleMedium" style={styles.storyTitle}>
              {item.title}
            </Text>
          )}

          <Text variant="bodyMedium" style={styles.storyContent}>
            {preview}
          </Text>

          {item.storyDate && (
            <Text variant="labelSmall" style={styles.storyEventDate}>
              Event date: {new Date(item.storyDate).toLocaleDateString()}
            </Text>
          )}

          <Text variant="labelSmall" style={styles.tapHint}>
            Tap to view full story • Long press to delete
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(255, 255, 255, 0.8)" translucent />
      
      {/* Custom Header - Android Contacts Style */}
      <View style={[headerStyles.header, { paddingTop: insets.top }]}>
        <View style={headerStyles.headerContent}>
          {!searchVisible ? (
            <>
              <Text variant="headlineMedium" style={headerStyles.headerTitle}>
                Stories
              </Text>
              <View style={headerStyles.headerActions}>
                <IconButton
                  icon="plus"
                  size={HEADER_ICON_SIZE}
                  style={headerStyles.headerIcon}
                  onPress={() => router.push('/story/addStory')}
                />
                <IconButton
                  icon="magnify"
                  size={HEADER_ICON_SIZE}
                  onPress={() => setSearchVisible(true)}
                />
              </View>
            </>
          ) : (
            <View style={styles.searchContainer}>
              <Searchbar
                placeholder="Search stories..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
                autoFocus
                icon="arrow-left"
                onIconPress={() => {
                  setSearchVisible(false);
                  setSearchQuery('');
                }}
              />
            </View>
          )}
        </View>
      </View>

      {stories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="titleLarge" style={styles.emptyTitle}>
            No stories yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyDescription}>
            Start capturing memories by adding your first story. Tell us about your friends,
            family, and the moments you share together.
          </Text>
          <Button mode="contained" onPress={() => router.push('/story/addStory')} style={styles.addButton}>
            Add Your First Story
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredStories}
          renderItem={renderStoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Text variant="bodyLarge">No stories match your search</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  statusBarSpacer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
  retryButton: {
    marginTop: 8,
  },
  searchContainer: {
    flex: 1,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: 'transparent',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  storyCard: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storyDate: {
    opacity: 0.6,
  },
  chips: {
    flexDirection: 'row',
    gap: 4,
  },
  aiChip: {
    height: 28,
    backgroundColor: '#e8f5e9',
  },
  wordChip: {
    height: 32,
    backgroundColor: '#f5f5f5',
  },
  storyTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  storyContent: {
    lineHeight: 22,
    color: '#333',
  },
  storyEventDate: {
    marginTop: 8,
    opacity: 0.6,
  },
  tapHint: {
    marginTop: 12,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 22,
  },
  addButton: {
    marginTop: 8,
  },
  noResults: {
    padding: 32,
    alignItems: 'center',
  },
});
