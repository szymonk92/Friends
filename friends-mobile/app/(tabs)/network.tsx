import CenteredContainer from '@/components/CenteredContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions, StyleSheet, View, ActivityIndicator, StatusBar, ScrollView } from 'react-native';
import { usePeople } from '@/hooks/usePeople';
import { useConnections } from '@/hooks/useConnections';
import { usePersonRelations } from '@/hooks/useRelations';
import { useAllTags, parseTags } from '@/hooks/useTags';
import { router, useFocusEffect } from 'expo-router';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { headerStyles, HEADER_ICON_SIZE } from '@/lib/styles/headerStyles';
import { getRelationshipColors, type RelationshipColorMap, DEFAULT_COLORS } from '@/lib/settings/relationship-colors';
import { Text, Button, IconButton, Chip, Searchbar } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import ForceDirectedGraph from '@/components/ForceDirectedGraph';
import NetworkPersonDetails from '@/components/NetworkPersonDetails';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NetworkScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: people = [], isLoading: loadingPeople, refetch } = usePeople();
  const { data: connections = [], isLoading: loadingConnections } = useConnections();
  
  console.log('[Network] Data loaded:', {
    peopleCount: people.length,
    connectionsCount: connections.length,
    loadingPeople,
    loadingConnections,
    peopleSample: people.slice(0, 3).map(p => ({ id: p.id, name: p.name, relationshipType: p.relationshipType })),
    connectionsSample: connections.slice(0, 3).map(c => ({ id: c.id, person1Id: c.person1Id, person2Id: c.person2Id })),
  });
  const { data: allTags = [] } = useAllTags();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<string[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [relationshipColors, setRelationshipColors] = useState<RelationshipColorMap>(DEFAULT_COLORS);
  const [searchQuery, setSearchQuery] = useState('');

  // Get relations for selected person
  const { data: selectedPersonRelations = [] } = usePersonRelations(selectedPersonId || '');

  useFocusEffect(
    useCallback(() => {
      getRelationshipColors().then((colors) => {
        console.log('[Network] Loaded relationship colors:', colors);
        setRelationshipColors(colors);
      });
    }, [])
  );

  // Get unique relationship types
  const relationshipTypes = useMemo(() => {
    return Array.from(new Set(people.map((p) => p.relationshipType).filter((type) => type !== null))) as string[];
  }, [people]);

  // Filter people based on search, tags and relationship types
  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      // Filter by search query
      const matchesSearch = searchQuery === '' || 
        person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (person.nickname && person.nickname.toLowerCase().includes(searchQuery.toLowerCase()));

      // Filter by tags
      const personTags = parseTags(person.tags);
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => personTags.includes(tag));

      // Filter by relationship type
      const matchesRelationType =
        selectedRelationTypes.length === 0 ||
        (person.relationshipType && selectedRelationTypes.includes(person.relationshipType));

      return matchesSearch && matchesTags && matchesRelationType;
    });
  }, [people, searchQuery, selectedTags, selectedRelationTypes]);

  // Filter connections to only show those between filtered people
  const filteredConnections = useMemo(() => {
    const filteredIds = new Set(filteredPeople.map((p) => p.id));
    return connections.filter((c) => filteredIds.has(c.person1Id) && filteredIds.has(c.person2Id));
  }, [connections, filteredPeople]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleRelationType = (type: string) => {
    setSelectedRelationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedRelationTypes([]);
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedRelationTypes.length > 0;

  // Get connections for selected person
  const selectedConnections = useMemo(() => {
    if (!selectedPersonId) return [];
    return filteredConnections.filter(
      (c) => c.person1Id === selectedPersonId || c.person2Id === selectedPersonId
    );
  }, [selectedPersonId, filteredConnections]);

  const isLoading = loadingPeople || loadingConnections;

  if (isLoading) {
    return (
      <CenteredContainer style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading network...</Text>
      </CenteredContainer>
    );
  }

  if (people.length === 0) {
    return (
      <CenteredContainer style={styles.centered}>
        <Text variant="titleLarge" style={styles.emptyTitle}>
          No network yet
        </Text>
        <Text variant="bodyMedium" style={styles.emptyDescription}>
          Add people and connections to see your social network graph.
        </Text>
        <Button mode="contained" onPress={() => router.push('/')}>
          Add People
        </Button>
      </CenteredContainer>
    );
  }

  const selectedPerson = people.find((p) => p.id === selectedPersonId);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(255, 255, 255, 0.8)" translucent />
      
      {/* Custom Header - Android Contacts Style */}
      <View style={[headerStyles.header, { paddingTop: insets.top }]}>
        <View style={headerStyles.headerContent}>
          <Text variant="headlineMedium" style={headerStyles.headerTitle}>
            Network
          </Text>
          <View style={headerStyles.headerActions}>
            {(allTags.length > 0 || relationshipTypes.length > 0) && (
              <IconButton
                icon={filtersVisible ? 'filter-variant' : 'filter-variant-remove'}
                size={HEADER_ICON_SIZE}
                style={headerStyles.headerIcon}
                onPress={() => setFiltersVisible(!filtersVisible)}
                iconColor={hasActiveFilters ? '#6200ee' : undefined}
              />
            )}
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search people..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            icon="magnify"
            clearIcon="close"
          />
        </View>

        {/* Filters */}
        {filtersVisible && (allTags.length > 0 || relationshipTypes.length > 0) && (
          <View style={styles.filterSection}>
            {relationshipTypes.length > 0 && (
              <View style={styles.filterGroup}>
                <Text variant="labelSmall" style={styles.filterLabel}>
                  Relationship Type
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {relationshipTypes.map((type) => (
                      <Chip
                        key={type}
                        selected={selectedRelationTypes.includes(type)}
                        onPress={() => toggleRelationType(type)}
                        style={styles.filterChip}
                        compact
                      >
                        {type}
                      </Chip>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {allTags.length > 0 && (
              <View style={styles.filterGroup}>
                <Text variant="labelSmall" style={styles.filterLabel}>
                  Tags
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {allTags.map((tag) => (
                      <Chip
                        key={tag}
                        selected={selectedTags.includes(tag)}
                        onPress={() => toggleTag(tag)}
                        style={styles.filterChip}
                        compact
                      >
                        {tag}
                      </Chip>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text variant="titleLarge" style={styles.statNumber}>{filteredPeople.length}</Text>
              <Text variant="labelSmall" style={styles.statLabel}>
                People{filteredPeople.length !== people.length && ` / ${people.length}`}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text variant="titleLarge" style={styles.statNumber}>{filteredConnections.length}</Text>
              <Text variant="labelSmall" style={styles.statLabel}>
                Connections
                {filteredConnections.length !== connections.length && ` / ${connections.length}`}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text variant="titleLarge" style={styles.statNumber}>
                {filteredPeople.length > 0
                  ? ((filteredConnections.length * 2) / filteredPeople.length).toFixed(1)
                  : '0'}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Avg Links</Text>
            </View>
          </View>
        </View>

        {/* Force-Directed Graph */}
        <View style={styles.graphSection}>
          {(() => {
            console.log('[Network] Rendering ForceDirectedGraph with:', {
              filteredPeopleCount: filteredPeople.length,
              filteredConnectionsCount: filteredConnections.length,
              selectedPersonId,
              relationshipColorsKeys: Object.keys(relationshipColors),
              peopleSample: filteredPeople.slice(0, 3).map(p => ({ id: p.id, name: p.name })),
              connectionsSample: filteredConnections.slice(0, 3).map(c => ({ id: c.id, person1Id: c.person1Id, person2Id: c.person2Id })),
            });
            return (
              <ForceDirectedGraph
                key={`graph-${Object.keys(relationshipColors).length}-${JSON.stringify(relationshipColors)}`}
                people={filteredPeople}
                connections={filteredConnections}
                relationshipColors={relationshipColors}
                selectedPersonId={selectedPersonId}
                onSelectPerson={setSelectedPersonId}
              />
            );
          })()}
        </View>

        {/* Selected person details */}
        {selectedPerson && (
          <NetworkPersonDetails
            person={selectedPerson}
            relations={selectedPersonRelations}
            relationshipColor={
              selectedPerson.relationshipType
                ? relationshipColors[selectedPerson.relationshipType] || theme.colors.primary
                : theme.colors.primary
            }
            connectionCount={selectedConnections.length}
          />
        )}

        <View style={styles.spacer} />
      </ScrollView>
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
  scrollContent: {
    flex: 1,
  },
  centered: {
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  emptyTitle: {
    marginBottom: 12,
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 22,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  filterToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 8,
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterIcon: {
    margin: 0,
  },
  filterToggleText: {
    marginLeft: 4,
  },
  filterActiveText: {
    color: '#6200ee',
    fontWeight: '600',
  },
  filterSection: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    marginBottom: 8,
    opacity: 0.6,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    marginRight: 4,
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: '700',
  },
  statLabel: {
    opacity: 0.6,
    marginTop: 4,
  },
  graphSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  graphTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  graphHint: {
    opacity: 0.5,
    marginBottom: 16,
  },
  graphContainer: {
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLine: {
    width: 20,
    height: 2,
    backgroundColor: '#ccc',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  infoTitle: {
    marginBottom: 8,
    fontWeight: '700',
  },
  infoChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  connectionsList: {
    marginTop: 8,
  },
  connectionsTitle: {
    marginBottom: 8,
  },
  connectionChip: {
    marginBottom: 4,
  },
  viewButton: {
    marginTop: 12,
  },
  spacer: {
    height: 32,
  },
});
