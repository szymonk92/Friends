import { StyleSheet, View, FlatList, ScrollView, RefreshControl, Image, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Card, FAB, Searchbar, Chip, ActivityIndicator, Button, IconButton, Menu, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { getInitials, formatRelativeTime, getImportanceColor } from '@/lib/utils/format';
import { usePeople } from '@/hooks/usePeople';
import { useAllTags, parseTags } from '@/hooks/useTags';
import { getRelationshipColors, type RelationshipColorMap, DEFAULT_COLORS } from '@/lib/settings/relationship-colors';
import { headerStyles, HEADER_ICON_SIZE } from '@/lib/styles/headerStyles';
import SectionDivider from '@/components/SectionDivider';

export default function PeopleListScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'importance'>('date');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuKey, setMenuKey] = useState(0);
  const [showCategoryDividers, setShowCategoryDividers] = useState(true);
  const [relationshipColors, setRelationshipColors] = useState<RelationshipColorMap>(DEFAULT_COLORS);
  const { data: people = [], isLoading, error, refetch } = usePeople();

  useFocusEffect(
    useCallback(() => {
      getRelationshipColors().then(setRelationshipColors);
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);
  const { data: allTags = [] } = useAllTags();

  // Get unique relationship types from people
  const relationshipTypes = Array.from(new Set(people.map((p) => p.relationshipType).filter(Boolean))).sort();

  const filteredPeople = useMemo(() => {
    console.log('[People] Recomputing filtered people, sortBy:', sortBy);
    return people
    .filter((person) => {
      // Filter by search query with scoring
      let searchScore = 0;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = person.name.toLowerCase();

        if (name === query) {
          searchScore = 3; // Exact match - highest priority
        } else if (name.startsWith(query)) {
          searchScore = 2; // Starts with - medium priority
        } else if (name.includes(query)) {
          searchScore = 1; // Contains - lowest priority
        } else {
          return false; // No match at all
        }
      } else {
        searchScore = 0; // No search query
      }

      // Store search score for sorting
      (person as any)._searchScore = searchScore;

      // Filter by selected tags (person must have ALL selected tags)
      const personTags = parseTags(person.tags);
      const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => personTags.includes(tag));

      // Filter by relationship type
      const matchesRelationType =
        selectedRelationTypes.length === 0 ||
        (person.relationshipType && selectedRelationTypes.includes(person.relationshipType));

      return matchesTags && matchesRelationType;
    })
    .sort((a, b) => {
      // First sort by search score (higher score = better match)
      const aScore = (a as any)._searchScore || 0;
      const bScore = (b as any)._searchScore || 0;
      if (aScore !== bScore) {
        return bScore - aScore; // Higher score first
      }

      // Then apply the selected sort criteria
      console.log('[People] Sorting by:', sortBy);
      switch (sortBy) {
        case 'name':
          console.log('[People] Name sort:', a.name, 'vs', b.name);
          return a.name.localeCompare(b.name);
        case 'importance': {
          // Relationship type weights (higher = more important)
          const relationshipWeights: Record<string, number> = {
            partner: 5,
            family: 4,
            friend: 3,
            colleague: 2,
            acquaintance: 1,
          };
          
          const importanceOrder = ['very_important', 'important', 'peripheral', 'unknown'];
          
          // First sort by relationship type (primary criteria)
          const aRelWeight = relationshipWeights[a.relationshipType || ''] || 0;
          const bRelWeight = relationshipWeights[b.relationshipType || ''] || 0;
          
          if (aRelWeight !== bRelWeight) {
            console.log('[People] Using relationship weight:', a.name, a.relationshipType, aRelWeight, 'vs', b.name, b.relationshipType, bRelWeight);
            return bRelWeight - aRelWeight; // Higher weight first
          }
          
          // If relationship types are same, use explicit importance as tiebreaker
          const aImportance = a.importanceToUser || 'unknown';
          const bImportance = b.importanceToUser || 'unknown';
          const aImportanceIndex = importanceOrder.indexOf(aImportance);
          const bImportanceIndex = importanceOrder.indexOf(bImportance);
          
          console.log('[People] Importance tiebreaker:', a.name, aImportance, `(${aImportanceIndex})`, 'vs', b.name, bImportance, `(${bImportanceIndex})`);
          
          if (aImportanceIndex !== bImportanceIndex) {
            return aImportanceIndex - bImportanceIndex; // Lower index (higher importance) first
          }
          
          // Finally sort by name
          return a.name.localeCompare(b.name);
        }
        case 'date':
        default:
          console.log('[People] Date sort:', a.name, new Date(a.updatedAt).toISOString(), 'vs', b.name, new Date(b.updatedAt).toISOString());
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [people, searchQuery, selectedTags, selectedRelationTypes, sortBy]);

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

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || selectedRelationTypes.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(255, 255, 255, 0.8)" translucent />
      {/* Custom Header - Android Contacts Style */}
      <View style={[headerStyles.header, { paddingTop: insets.top }]}>
        <View style={headerStyles.headerContent}>
          {!searchVisible ? (
            <>
              <Text variant="headlineMedium" style={headerStyles.headerTitle}>
                People
              </Text>
              <View style={headerStyles.headerActions}>
                <IconButton
                  icon="account-plus"
                  size={HEADER_ICON_SIZE}
                  style={headerStyles.headerIcon}
                  onPress={() => router.push('/modal')}
                />
                <IconButton
                  icon="magnify"
                  size={HEADER_ICON_SIZE}
                  style={headerStyles.headerIcon}
                  onPress={() => setSearchVisible(true)}
                />
                <Menu
                  key={menuKey}
                  visible={menuVisible}
                  onDismiss={() => {
                    console.log('[People] Menu dismissed');
                    setMenuVisible(false);
                    setMenuKey(prev => prev + 1);
                  }}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={HEADER_ICON_SIZE}
                      onPress={() => {
                        console.log('[People] Menu button pressed, current visible:', menuVisible);
                        setMenuVisible(!menuVisible);
                        if (!menuVisible) {
                          setMenuKey(prev => prev + 1);
                        }
                      }}
                    />
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      router.push('/settings');
                    }}
                    title="Settings"
                    leadingIcon="cog"
                  />
                  <Menu.Item
                    onPress={() => {
                      console.log('[People] Menu: Sort by name clicked');
                      setSortBy('name');
                      setMenuVisible(false);
                    }}
                    title="Sort by name"
                    leadingIcon={sortBy === 'name' ? 'check' : 'sort-alphabetical-ascending'}
                  />
                  <Menu.Item
                    onPress={() => {
                      console.log('[People] Menu: Sort by date clicked');
                      setSortBy('date');
                      setMenuVisible(false);
                    }}
                    title="Sort by recent"
                    leadingIcon={sortBy === 'date' ? 'check' : 'clock-outline'}
                  />
                  <Menu.Item
                    onPress={() => {
                      console.log('[People] Menu: Sort by importance clicked');
                      setSortBy('importance');
                      setMenuVisible(false);
                    }}
                    title="Sort by importance"
                    leadingIcon={sortBy === 'importance' ? 'check' : 'star'}
                  />
                  <Divider />
                  <Menu.Item
                    onPress={() => {
                      setShowCategoryDividers(!showCategoryDividers);
                      setMenuVisible(false);
                    }}
                    title={showCategoryDividers ? 'Hide category dividers' : 'Show category dividers'}
                    leadingIcon={showCategoryDividers ? 'eye-off' : 'eye'}
                  />
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      clearAllFilters();
                    }}
                    title="Clear filters"
                    leadingIcon="filter-remove"
                    disabled={!hasActiveFilters}
                  />
                </Menu>
              </View>
            </>
          ) : (
            <View style={styles.searchContainer}>
              <Searchbar
                placeholder="Search people..."
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

        {/* Filter Chips Row */}
        {(selectedTags.length > 0 || selectedRelationTypes.length > 0) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterChipsRow}
            contentContainerStyle={styles.filterChipsContent}
          >
            {selectedRelationTypes.map((type) => (
              <Chip
                key={type}
                onClose={() => toggleRelationType(type)}
                style={styles.activeFilterChip}
                compact
              >
                {type}
              </Chip>
            ))}
            {selectedTags.map((tag) => (
              <Chip
                key={tag}
                onClose={() => toggleTag(tag)}
                style={styles.activeFilterChip}
                compact
                icon="tag"
              >
                {tag}
              </Chip>
            ))}
          </ScrollView>
        )}
      </View>

      {filteredPeople && filteredPeople.length === 0 && !searchQuery && (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No people yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Add your first person to get started!
          </Text>
          <Button
            mode="contained"
            onPress={() => router.push('/modal')}
            style={styles.emptyButton}
          >
            Add a Person
          </Button>
        </View>
      )}

      {filteredPeople && filteredPeople.length === 0 && searchQuery && (
        <View style={styles.emptyState}>
          <Text variant="bodyMedium" style={styles.emptyText}>
            No results found for "{searchQuery}"
          </Text>
        </View>
      )}

      <FlatList
        data={filteredPeople}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          filteredPeople.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text variant="labelSmall" style={styles.sectionHeaderText}>
                {selectedTags.length > 0 || selectedRelationTypes.length > 0 || searchQuery
                  ? `${filteredPeople.length} ${filteredPeople.length === 1 ? 'contact' : 'contacts'}`
                  : `${people.length} ${people.length === 1 ? 'contact' : 'contacts'}`}
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#6200ee']} />
        }
        renderItem={({ item, index }) => {
          const avatarColor = item.relationshipType
            ? relationshipColors[item.relationshipType] || '#6200ee'
            : '#6200ee';
          
          // Check if we need to show category divider
          const currentCategory = item.relationshipType || 'Other';
          const previousCategory = index > 0 ? (filteredPeople[index - 1].relationshipType || 'Other') : null;
          const nextCategory = index < filteredPeople.length - 1 ? (filteredPeople[index + 1].relationshipType || 'Other') : null;
          const showCategoryHeader = showCategoryDividers && (index === 0 || currentCategory !== previousCategory);
          const isLastInCategory = nextCategory !== currentCategory;

          return (
            <>
              {showCategoryHeader && (
                <SectionDivider 
                  label={currentCategory} 
                  variant="labelMedium" 
                  textStyle="uppercase"
                  marginVertical={16}
                />
              )}
              <TouchableOpacity
                style={[styles.listItem, { borderLeftWidth: 3, borderLeftColor: avatarColor }]}
                onPress={() => router.push(`/person/${item.id}`)}
                activeOpacity={0.7}
              >
                {item.photoPath ? (
                  <View style={styles.avatarWithBorder}>
                    <Image source={{ uri: item.photoPath }} style={styles.avatarImage} />
                    <View style={[styles.avatarIndicator, { backgroundColor: avatarColor }]} />
                  </View>
                ) : (
                  <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                  </View>
                )}
                <View style={styles.listItemContent}>
                  <View style={styles.nameRow}>
                    <Text variant="titleMedium" style={styles.name}>
                      {item.name}
                    </Text>
                  </View>
                  {item.relationshipType && (
                    <Text variant="bodySmall" style={[styles.subtitle, { color: avatarColor }]}>
                      {item.relationshipType}
                      {item.nickname && (
                        <Text style={styles.subtitleNickname}> • "{item.nickname}"</Text>
                      )}
                    </Text>
                  )}
                  {!item.relationshipType && item.nickname && (
                    <Text variant="bodySmall" style={styles.subtitle}>
                      "{item.nickname}"
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {!isLastInCategory && <View style={styles.separator} />}
            </>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flex: 1,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: 'transparent',
  },
  filterChipsRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterChipsContent: {
    gap: 8,
  },
  activeFilterChip: {
    marginRight: 8,
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
    paddingBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  listItemContent: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 72,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarWithBorder: {
    position: 'relative',
    marginRight: 16,
  },
  avatarIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontWeight: '500',
    fontSize: 16,
    color: '#202124',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  subtitleNickname: {
    fontSize: 14,
    color: '#5f6368',
    fontWeight: '400',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  sectionHeaderText: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
