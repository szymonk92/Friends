import CenteredContainer from '@/components/CenteredContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, StyleSheet, View, ActivityIndicator, StatusBar, FlatList, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native-paper';
import { useStories, useDeleteStory } from '@/hooks/useStories';
import { confirmDestructive } from '@/lib/utils/confirm';
import { formatRelativeTime } from '@/lib/utils/format';
import { fz, fzText } from '@/lib/design/tokens';
import { IconCircle } from '@/components/IconCircle';
import { Pill } from '@/components/Pill';

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

    confirmDestructive({
      title: 'Delete Story',
      message,
      onConfirm: async () => {
        try {
          await deleteStory.mutateAsync(storyId);
          Alert.alert('Success', 'Story deleted successfully');
        } catch (err) {
          Alert.alert('Error', 'Failed to delete story. Please try again.');
        }
      },
    });
  };

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
        <Text style={{ ...fzText.sub, marginTop: 12 }}>Loading stories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centered}>
        <Text style={{ ...fzText.sub, marginBottom: 16 }}>Failed to load stories</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => refetch()} activeOpacity={0.8}>
          <Text style={{ ...fzText.chipOn, fontSize: 15, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderStoryItem = ({ item }: { item: any }) => {
    const wordCount = item.content.trim().split(/\s+/).filter(Boolean).length;
    const preview =
      item.content.length > 200 ? item.content.substring(0, 200) + '...' : item.content;

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/story/${item.id}`)}
        onLongPress={() => handleDeleteStory(item.id, item.aiProcessed)}
      >
        <View style={s.cardHeader}>
          <Text style={fzText.time}>{formatRelativeTime(new Date(item.createdAt))}</Text>
          <View style={s.chips}>
            {item.aiProcessed && <Pill label="AI Processed" variant="soft" />}
            <Pill label={`${wordCount} words`} variant="surface" />
          </View>
        </View>

        {item.title && <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>}

        <Text style={fzText.body} numberOfLines={4}>{preview}</Text>

        {item.storyDate && (
          <Text style={{ ...fzText.time, marginTop: 8 }}>
            Event date: {new Date(item.storyDate).toLocaleDateString()}
          </Text>
        )}

        <Text style={s.tapHint}>Tap to view • Long press to delete</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      {/* App bar */}
      <View style={[s.appBar, { paddingTop: insets.top + 8 }]}>
        {!searchVisible ? (
          <View style={s.appBarRow}>
            <Text style={fzText.screenTitle}>Stories</Text>
            <View style={s.appBarActions}>
              <IconCircle icon="plus" onPress={() => router.push('/story/addStory')} />
              <IconCircle icon="search" onPress={() => setSearchVisible(true)} />
            </View>
          </View>
        ) : (
          <View style={s.searchRow}>
            <IconCircle icon="back" onPress={() => { setSearchVisible(false); setSearchQuery(''); }} />
            <View style={s.searchInput}>
              <TextInput
                placeholder="Search stories..."
                placeholderTextColor={fz.textMute}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                style={s.searchText}
              />
            </View>
          </View>
        )}
        {stories.length > 0 && (
          <Text style={[fzText.meta, { paddingHorizontal: fz.s.edge, paddingBottom: fz.s.md }]}>
            {stories.length} {stories.length === 1 ? 'story' : 'stories'} captured
          </Text>
        )}
      </View>

      {stories.length === 0 ? (
        <View style={s.empty}>
          <Text style={fzText.title}>No stories yet</Text>
          <Text style={[fzText.sub, { marginTop: 8, marginBottom: 24, textAlign: 'center' }]}>
            Start capturing memories by adding your first story. Tell us about your friends, family, and the moments you share together.
          </Text>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.push('/story/addStory')}
            activeOpacity={0.8}
          >
            <Text style={{ ...fzText.chipOn, fontSize: 15, fontWeight: '600' }}>
              Add Your First Story
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredStories}
          renderItem={renderStoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.noResults}>
              <Text style={fzText.sub}>No stories match your search</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: fz.paper },
  appBar: { backgroundColor: fz.paper },
  appBarRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: fz.s.edge, paddingBottom: 2,
  },
  appBarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: fz.s.edge, paddingBottom: 6 },
  searchInput: {
    flex: 1, height: 42, borderRadius: fz.rPill, backgroundColor: fz.surface,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  searchText: { fontFamily: fz.font, fontSize: 15, color: fz.ink, padding: 0 },
  list: { padding: fz.s.edge, paddingTop: 4, paddingBottom: 110 },
  card: {
    backgroundColor: fz.card, borderRadius: fz.rCard, borderWidth: 1,
    borderColor: fz.cardBorder, padding: 16, marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, gap: 8, flexWrap: 'wrap',
  },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cardTitle: {
    ...fzText.name, fontSize: 17, marginBottom: 6,
  },
  tapHint: {
    ...fzText.time, fontStyle: 'italic', marginTop: 12,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  primaryBtn: {
    backgroundColor: fz.ink, height: 50, borderRadius: fz.rButton,
    paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center',
  },
  noResults: { padding: 32, alignItems: 'center' },
});