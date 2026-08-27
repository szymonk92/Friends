import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import {
  View,
  Image,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { usePeople, type PersonWithPhoto } from '@/hooks/usePeople';
import { useRelations } from '@/hooks/useRelations';
import { useStories } from '@/hooks/useStories';
import { useConnections } from '@/hooks/useConnections';
import { getInitials, formatRelativeTime } from '@/lib/utils/format';
import { LIKES, DISLIKES } from '@/lib/constants/relations';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { LineIcon } from '@/components/LineIcon';
import { RelationIcon } from '@/components/RelationIcon';

type SearchCategory = 'all' | 'people' | 'relations' | 'stories';

interface SearchResult {
  id: string;
  type: 'person' | 'relation' | 'story' | 'connection';
  title: string;
  subtitle: string;
  metadata?: string;
  personId?: string;
}

const CATEGORIES: { key: SearchCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'people', label: 'People' },
  { key: 'relations', label: 'Preferences' },
  { key: 'stories', label: 'Stories' },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');

  // 'all' so pets (and their species) and mentioned children are searchable too.
  const { data: people = [], isLoading: loadingPeople } = usePeople({ entityType: 'all' });
  const { data: relations = [], isLoading: loadingRelations } = useRelations();
  const { data: stories = [], isLoading: loadingStories } = useStories();
  const { data: connections = [], isLoading: loadingConnections } = useConnections();

  const isLoading = loadingPeople || loadingRelations || loadingStories || loadingConnections;

  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person?.name || 'Unknown';
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    if (category === 'all' || category === 'people') {
      people.forEach((person) => {
        const nameMatch = person.name.toLowerCase().includes(query);
        const nicknameMatch = person.nickname?.toLowerCase().includes(query);
        const notesMatch = person.notes?.toLowerCase().includes(query);
        const speciesMatch = person.species?.toLowerCase().includes(query);

        if (nameMatch || nicknameMatch || notesMatch || speciesMatch) {
          const isPet = person.entityType === 'pet';
          results.push({
            id: person.id,
            type: 'person',
            title: person.name,
            subtitle: isPet
              ? `🐾 ${person.species?.trim() || 'Pet'}`
              : person.relationshipType || 'No relationship type',
            metadata: person.nickname ? `"${person.nickname}"` : undefined,
            personId: person.id,
          });
        }
      });
    }

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
            metadata: relation.confidence ? `${Math.round(relation.confidence * 100)}%` : undefined,
            personId: relation.subjectId,
          });
        }
      });
    }

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

  const preferenceSummary = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return null;

    const query = searchQuery.toLowerCase().trim();

    const likes = relations.filter(
      (r) => r.relationType === LIKES && r.objectLabel.toLowerCase().includes(query)
    );
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
      router.push('/stories');
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    const person = item.personId ? people.find((p) => p.id === item.personId) : null;
    return (
      <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => handleResultPress(item)}>
        <ResultAvatar person={person} type={item.type} />
        <View style={s.rowBody}>
          <View style={s.rowTop}>
            {category === 'all' && <Pill label={item.type} variant="surface" />}
            {item.metadata && <Text style={fzText.time}>{item.metadata}</Text>}
          </View>
          <Text style={fzText.name} numberOfLines={1}>{item.title}</Text>
          <Text style={fzText.sub} numberOfLines={2}>{item.subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSummaryRow = (item: { personId: string; personName: string; item: string; intensity?: string | null }) => {
    const person = people.find((p) => p.id === item.personId);
    return (
      <TouchableOpacity
        style={s.summaryRow}
        activeOpacity={0.7}
        onPress={() => router.push(`/person/${item.personId}`)}
      >
        {person?.photoPath ? (
          <Image source={{ uri: person.photoPath }} style={s.summaryAvatar} />
        ) : (
          <View style={s.summaryAvatar}>
            <Text style={s.summaryAvatarText}>{getInitials(item.personName)}</Text>
          </View>
        )}
        <View style={s.summaryBody}>
          <Text style={fzText.name} numberOfLines={1}>{item.personName}</Text>
          <Text style={fzText.sub} numberOfLines={1}>
            {item.item}{item.intensity ? ` · ${item.intensity}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      {/* App bar / search */}
      <View style={[s.appBar, { paddingTop: insets.top + 8 }]}>
        <View style={s.searchRow}>
          <View style={s.searchInput}>
            <TextInput
              placeholder="Search people, preferences, stories..."
              placeholderTextColor={fz.textMute}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              style={s.searchText}
            />
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.categories}
          contentContainerStyle={s.categoriesContent}
        >
          {CATEGORIES.map((c) => (
            <Pill
              key={c.key}
              label={c.label}
              selected={category === c.key}
              onPress={() => setCategory(c.key)}
            />
          ))}
        </ScrollView>
      </View>

      {isLoading && (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={fz.ink} />
        </View>
      )}

      {!isLoading && searchQuery.length < 2 && (
        <View style={s.empty}>
          <Text style={fzText.title}>Start searching</Text>
          <Text style={[fzText.sub, { marginTop: 8, marginBottom: 16, textAlign: 'center' }]}>
            Search for people, preferences (who likes/dislikes what), or story content.
          </Text>
          <Text style={s.exampleText}>Examples: "carrot", "vegan", "hiking", "Sarah"</Text>
        </View>
      )}

      {!isLoading && searchQuery.length >= 2 && (
        <>
          {preferenceSummary &&
            (preferenceSummary.likes.length > 0 || preferenceSummary.dislikes.length > 0) && (
              <View style={s.summaryCard}>
                <Text style={fzText.title}>Who likes/dislikes "{searchQuery}"?</Text>

                {preferenceSummary.likes.length > 0 && (
                  <View style={s.summarySection}>
                    <View style={s.summaryLabelRow}>
                      <RelationIcon type={LIKES} size={13} color={fz.ink} />
                      <Text style={fzText.label}>Likes ({preferenceSummary.likes.length})</Text>
                    </View>
                    {preferenceSummary.likes.map((item, index) => (
                      <View key={`like-${index}`}>{renderSummaryRow(item)}</View>
                    ))}
                  </View>
                )}

                {preferenceSummary.dislikes.length > 0 && (
                  <View style={s.summarySection}>
                    <View style={s.summaryLabelRow}>
                      <RelationIcon type={DISLIKES} size={13} color={fz.ink} />
                      <Text style={fzText.label}>Dislikes ({preferenceSummary.dislikes.length})</Text>
                    </View>
                    {preferenceSummary.dislikes.map((item, index) => (
                      <View key={`dislike-${index}`}>{renderSummaryRow(item)}</View>
                    ))}
                  </View>
                )}
              </View>
            )}

          <View style={s.resultsHeader}>
            <Text style={fzText.meta}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </Text>
          </View>

          {searchResults.length === 0 ? (
            <View style={s.noResults}>
              <Text style={fzText.sub}>No results found</Text>
              <Text style={[fzText.time, { marginTop: 6 }]}>Try a different search term or category</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderResult}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              contentContainerStyle={s.resultsList}
            />
          )}
        </>
      )}
    </View>
  );
}

/** Left-side avatar for a search result: person photo if present, initials
 *  fallback, or a generic icon for person-less results (stories). */
function ResultAvatar({
  person,
  type,
}: {
  person: PersonWithPhoto | null | undefined;
  type: SearchResult['type'];
}) {
  if (person?.photoPath) {
    return <Image source={{ uri: person.photoPath }} style={s.avatar} />;
  }
  if (person) {
    return (
      <View style={[s.avatar, { backgroundColor: fz.surface }]}>
        <Text style={[s.avatarText, { color: fz.ink }]}>{getInitials(person.name)}</Text>
      </View>
    );
  }
  return (
    <View style={[s.avatar, { backgroundColor: fz.surface }]}>
      <LineIcon name={type === 'story' ? 'book' : 'users'} size={18} color={fz.ink} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  centered: { padding: 20, alignItems: 'center', backgroundColor: fz.paper },
  appBar: { backgroundColor: fz.paper, paddingBottom: 4 },
  searchRow: { paddingHorizontal: fz.s.edge, paddingBottom: fz.s.md },
  searchInput: {
    height: 44, borderRadius: fz.rPill, backgroundColor: fz.surface,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  searchText: { fontFamily: fz.font, fontSize: 15, color: fz.ink, padding: 0 },
  categories: { paddingHorizontal: fz.s.edge },
  categoriesContent: { gap: 8, paddingRight: fz.s.edge, paddingBottom: fz.s.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  exampleText: { ...fzText.sub, fontStyle: 'italic' },
  summaryCard: {
    marginHorizontal: fz.s.edge, marginBottom: 8, padding: 16,
    backgroundColor: fz.card, borderRadius: fz.rCard, borderWidth: 1,
    borderColor: fz.cardBorder,
  },
  summarySection: { marginTop: 14 },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8,
  },
  summaryAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: fz.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  summaryAvatarText: { color: fz.ink, fontSize: 13, fontWeight: '600', fontFamily: fz.font },
  summaryBody: { flex: 1, minWidth: 0 },
  resultsHeader: { paddingHorizontal: fz.s.edge, paddingVertical: 8 },
  resultsList: { paddingHorizontal: fz.s.edge, paddingTop: 0, paddingBottom: 110 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: fz.hairline,
  },
  rowBody: { flex: 1, minWidth: 0 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: fz.font },
  rowTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, marginBottom: 6,
  },
  noResults: { padding: 32, alignItems: 'center' },
});