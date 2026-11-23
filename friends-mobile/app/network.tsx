import { relationshipTypeLabel } from '@/lib/i18n/labels';
import { StyleSheet, View, ActivityIndicator, StatusBar, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { usePeople } from '@/hooks/usePeople';
import { useConnections, useCreateConnection } from '@/hooks/useConnections';
import { useStories } from '@/hooks/useStories';
import { storyPeople, suggestConnections } from '@/lib/graph/suggestions';
import { Avatar } from '@/components/Avatar';
import { usePersonRelations } from '@/hooks/useRelations';
import { useAllTags, parseTags } from '@/hooks/useTags';
import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import ForceDirectedGraph from '@/components/graph/ForceDirectedGraph';
import NetworkPersonDetails from '@/components/graph/NetworkPersonDetails';
import { fz, fzText } from '@/lib/design/tokens';
import { IconCircle } from '@/components/IconCircle';
import { AppBar } from '@/components/AppBar';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';

export default function NetworkScreen() {
  const { t } = useTranslation();
  const { data: people = [], isLoading: loadingPeople } = usePeople();
  const { data: connections = [], isLoading: loadingConnections } = useConnections();
  const { data: allTags = [] } = useAllTags();
  const { data: stories = [] } = useStories();
  const createConnection = useCreateConnection();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<string[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [graphTouched, setGraphTouched] = useState(false);

  const { data: selectedPersonRelations = [] } = usePersonRelations(selectedPersonId || '');

  // Unique relationship types
  const relationshipTypes = useMemo(
    () =>
      Array.from(
        new Set(people.map((p) => p.relationshipType).filter((type): type is string => type != null))
      ),
    [people]
  );

  const filteredPeople = useMemo(
    () =>
      people.filter((person) => {
        const matchesSearch =
          searchQuery === '' ||
          person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (person.nickname && person.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
        const personTags = parseTags(person.tags);
        const matchesTags =
          selectedTags.length === 0 || selectedTags.some((tag) => personTags.includes(tag));
        const matchesRelationType =
          selectedRelationTypes.length === 0 ||
          (person.relationshipType && selectedRelationTypes.includes(person.relationshipType));
        return matchesSearch && matchesTags && matchesRelationType;
      }),
    [people, searchQuery, selectedTags, selectedRelationTypes]
  );

  const filteredConnections = useMemo(() => {
    const filteredIds = new Set(filteredPeople.map((p) => p.id));
    return connections.filter((c) => filteredIds.has(c.person1Id) && filteredIds.has(c.person2Id));
  }, [connections, filteredPeople]);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const toggleRelationType = (type: string) =>
    setSelectedRelationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedRelationTypes([]);
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedRelationTypes.length > 0;

  // Who the selected person knows (within the current filter), with the person on the other end.
  const selectedLinks = useMemo(() => {
    if (!selectedPersonId) return [];
    const byId = new Map(filteredPeople.map((p) => [p.id, p]));
    return filteredConnections.flatMap((connection) => {
      const otherId =
        connection.person1Id === selectedPersonId
          ? connection.person2Id
          : connection.person2Id === selectedPersonId
            ? connection.person1Id
            : null;
      const other = otherId ? byId.get(otherId) : undefined;
      return other ? [{ connection, other }] : [];
    });
  }, [selectedPersonId, filteredConnections, filteredPeople]);

  // People mentioned together in stories but not connected yet.
  const suggestions = useMemo(() => {
    const byId = new Map(people.map((p) => [p.id, p]));
    return suggestConnections(stories.map(storyPeople), connections, new Set(byId.keys())).map((s) => ({
      ...s,
      personA: byId.get(s.a)!,
      personB: byId.get(s.b)!,
    }));
  }, [stories, connections, people]);

  const isLoading = loadingPeople || loadingConnections;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fz.ink} />
          <Text style={[fzText.sub, { marginTop: 12 }]}>{t('network.loading')}</Text>
        </View>
      </View>
    );
  }

  if (people.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <AppBar title={t('network.title')} />
        <View style={styles.empty}>
          <Text style={fzText.title}>{t('network.empty.title')}</Text>
          <Text style={[fzText.sub, { marginTop: 8, marginBottom: 24, textAlign: 'center' }]}>
            {t('network.empty.description')}
          </Text>
          <PrimaryButton label={t('network.empty.addPeople')} onPress={() => router.push('/')} />
        </View>
      </View>
    );
  }

  const selectedPerson = filteredPeople.find((p) => p.id === selectedPersonId);
  const showFilters = filtersVisible && (allTags.length > 0 || relationshipTypes.length > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      {/* App bar */}
      <View style={styles.appBar}>
        <AppBar
          title={t('network.title')}
          right={
            <>
              <IconCircle icon="heart" onPress={() => router.push('/shared-interests')} />
              {allTags.length > 0 || relationshipTypes.length > 0 ? (
                <IconCircle
                  icon="filter"
                  fill={hasActiveFilters ? fz.ink : undefined}
                  color={hasActiveFilters ? fz.paper : fz.ink}
                  onPress={() => setFiltersVisible(!filtersVisible)}
                />
              ) : null}
            </>
          }
        />

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <TextInput
              placeholder={t('network.searchPlaceholder')}
              placeholderTextColor={fz.textMute}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchText}
            />
          </View>
        </View>
      </View>

      <ScrollView scrollEnabled={!graphTouched} style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner}>
        {/* Filters */}
        {showFilters && (
          <View style={styles.filterSection}>
            {hasActiveFilters && (
              <View style={styles.filterHeader}>
                <Text style={fzText.label}>{t('common.filter')}</Text>
                <TouchableOpacity onPress={clearFilters} hitSlop={8} activeOpacity={0.6}>
                  <Text style={styles.clearBtn}>{t('people.clearFilters')}</Text>
                </TouchableOpacity>
              </View>
            )}
            {relationshipTypes.length > 0 && (
              <View style={styles.filterGroup}>
                <Text style={fzText.label}>{t('person.relationshipType')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {relationshipTypes.map((type) => (
                    <Pill
                      key={type}
                      label={relationshipTypeLabel(type)}
                      selected={selectedRelationTypes.includes(type)}
                      onPress={() => toggleRelationType(type)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
            {allTags.length > 0 && (
              <View style={styles.filterGroup}>
                <Text style={fzText.label}>{t('network.tags')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {allTags.map((tag) => (
                    <Pill
                      key={tag}
                      label={tag}
                      selected={selectedTags.includes(tag)}
                      onPress={() => toggleTag(tag)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{filteredPeople.length}</Text>
            <Text style={fzText.label}>{t('network.stats.people')}{filteredPeople.length !== people.length && ` / ${people.length}`}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{filteredConnections.length}</Text>
            <Text style={fzText.label}>{t('network.stats.links')}{filteredConnections.length !== connections.length && ` / ${connections.length}`}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>
              {filteredPeople.length > 0
                ? ((filteredConnections.length * 2) / filteredPeople.length).toFixed(1)
                : '0'}
            </Text>
            <Text style={fzText.label}>{t('network.stats.avg')}</Text>
          </View>
        </View>

        {/* Graph */}
        <View style={styles.graphCard}>
          {filteredPeople.length > 0 ? (
            <ForceDirectedGraph
              onTouchingChange={setGraphTouched}
              people={filteredPeople}
              connections={filteredConnections}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
            />
          ) : (
            <View style={styles.noMatches}>
              <Text style={fzText.sub}>{t('search.noResults')}</Text>
            </View>
          )}
        </View>
        <Text style={[fzText.time, { paddingHorizontal: fz.s.edge, marginTop: 8 }]}>
          {t('network.hint')}
        </Text>

        {/* Suggested connections */}
        {suggestions.length > 0 && !selectedPerson && (
          <View style={styles.suggestions}>
            <Text style={fzText.label}>{t('network.suggestions.title')}</Text>
            {suggestions.map((sug) => (
              <View key={`${sug.a}|${sug.b}`} style={styles.suggestionRow}>
                <Avatar name={sug.personA.name} photoPath={sug.personA.photoPath} size={32} />
                <Avatar name={sug.personB.name} photoPath={sug.personB.photoPath} size={32} style={styles.avatarOverlap} />
                <View style={styles.suggestionText}>
                  <Text style={fzText.name} numberOfLines={1}>
                    {sug.personA.name} & {sug.personB.name}
                  </Text>
                  <Text style={fzText.sub}>{t('network.suggestions.sharedStories', { count: sug.sharedStories })}</Text>
                </View>
                <Pill
                  label={t('network.suggestions.connect')}
                  variant="solid"
                  onPress={() =>
                    createConnection.mutate({ person1Id: sug.a, person2Id: sug.b, relationshipType: 'acquaintance' })
                  }
                />
              </View>
            ))}
          </View>
        )}

        {/* Selected person details */}
        {selectedPerson && (
          <NetworkPersonDetails
            person={selectedPerson}
            relations={selectedPersonRelations}
            links={selectedLinks}
            onSelectPerson={setSelectedPersonId}
          />
        )}

        <View style={{ height: fz.s.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appBar: { backgroundColor: fz.paper, paddingBottom: fz.s.md },
  searchRow: { paddingHorizontal: fz.s.edge },
  searchInput: {
    height: 44, borderRadius: fz.rPill, backgroundColor: fz.surface,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  searchText: { fontFamily: fz.font, fontSize: 15, color: fz.ink, padding: 0 },
  scrollContent: { flex: 1 },
  scrollContentInner: { paddingBottom: 120 },
  filterSection: {
    marginHorizontal: fz.s.edge, marginBottom: fz.s.md, padding: fz.s.md,
    backgroundColor: fz.surfaceSoft, borderRadius: fz.rCard,
  },
  filterHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: fz.s.md,
  },
  clearBtn: { ...fzText.label, color: fz.textMute },
  filterGroup: { marginBottom: fz.s.md },
  chipRow: { gap: 8, paddingRight: fz.s.edge, paddingTop: 8 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: fz.s.edge, paddingVertical: fz.s.md,
  },
  stat: { alignItems: 'center' },
  statNumber: { ...fzText.titleLg, fontSize: 26 },
  graphCard: {
    marginHorizontal: fz.s.edge, backgroundColor: fz.card, borderRadius: fz.rCard,
    borderWidth: 1, borderColor: fz.cardBorder, padding: 8, overflow: 'hidden',
  },
  suggestions: {
    marginHorizontal: fz.s.edge, marginTop: fz.s.lg, padding: fz.s.lg,
    backgroundColor: fz.card, borderRadius: fz.rCard, borderWidth: 1, borderColor: fz.cardBorder,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingTop: fz.s.md },
  avatarOverlap: { marginLeft: -10, borderWidth: 2, borderColor: fz.card },
  suggestionText: { flex: 1, marginHorizontal: fz.s.md },
  noMatches: { height: 450, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
});