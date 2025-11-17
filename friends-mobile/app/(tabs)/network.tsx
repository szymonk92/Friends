import { StyleSheet, View, Dimensions, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, Button, Chip } from 'react-native-paper';
import { usePeople } from '@/hooks/usePeople';
import { useConnections } from '@/hooks/useConnections';
import { useAllTags, parseTags } from '@/hooks/useTags';
import { router } from 'expo-router';
import { getInitials } from '@/lib/utils/format';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useState, useMemo } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_SIZE = SCREEN_WIDTH - 32;
const CENTER_X = GRAPH_SIZE / 2;
const CENTER_Y = GRAPH_SIZE / 2;
const RADIUS = GRAPH_SIZE / 2 - 50;

export default function NetworkScreen() {
  const { data: people = [], isLoading: loadingPeople, refetch } = usePeople();
  const { data: connections = [], isLoading: loadingConnections } = useConnections();
  const { data: allTags = [] } = useAllTags();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRelationTypes, setSelectedRelationTypes] = useState<string[]>([]);

  // Get unique relationship types
  const relationshipTypes = useMemo(() => {
    return Array.from(new Set(people.map((p) => p.relationshipType).filter(Boolean))).sort();
  }, [people]);

  // Filter people based on selected tags and relationship types
  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      // Filter by tags
      const personTags = parseTags(person.tags);
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => personTags.includes(tag));

      // Filter by relationship type
      const matchesRelationType =
        selectedRelationTypes.length === 0 ||
        (person.relationshipType && selectedRelationTypes.includes(person.relationshipType));

      return matchesTags && matchesRelationType;
    });
  }, [people, selectedTags, selectedRelationTypes]);

  // Filter connections to only show those between filtered people
  const filteredConnections = useMemo(() => {
    const filteredIds = new Set(filteredPeople.map((p) => p.id));
    return connections.filter((c) => filteredIds.has(c.person1Id) && filteredIds.has(c.person2Id));
  }, [connections, filteredPeople]);

  // Calculate node positions in a circle
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    filteredPeople.forEach((person, index) => {
      const angle = (2 * Math.PI * index) / filteredPeople.length - Math.PI / 2;
      positions[person.id] = {
        x: CENTER_X + RADIUS * Math.cos(angle),
        y: CENTER_Y + RADIUS * Math.sin(angle),
      };
    });
    return positions;
  }, [filteredPeople]);

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

  // Calculate connection statistics
  const connectionStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredConnections.forEach((conn) => {
      stats[conn.person1Id] = (stats[conn.person1Id] || 0) + 1;
      stats[conn.person2Id] = (stats[conn.person2Id] || 0) + 1;
    });
    return stats;
  }, [filteredConnections]);

  // Get node size based on connections
  const getNodeSize = (personId: string) => {
    const count = connectionStats[personId] || 0;
    return Math.min(30, 15 + count * 5);
  };

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
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading network...</Text>
      </View>
    );
  }

  if (people.length === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="titleLarge" style={styles.emptyTitle}>
          No network yet
        </Text>
        <Text variant="bodyMedium" style={styles.emptyDescription}>
          Add people and connections to see your social network graph.
        </Text>
        <Button mode="contained" onPress={() => router.push('/(tabs)/')}>
          Add People
        </Button>
      </View>
    );
  }

  const selectedPerson = people.find((p) => p.id === selectedPersonId);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Network Graph
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Visualize connections between people
        </Text>
      </View>

      {/* Filters */}
      {(allTags.length > 0 || relationshipTypes.length > 0) && (
        <Card style={styles.filterCard}>
          <Card.Content>
            <View style={styles.filterHeader}>
              <Text variant="titleMedium">Filter Graph</Text>
              {(selectedTags.length > 0 || selectedRelationTypes.length > 0) && (
                <Button compact mode="text" onPress={clearFilters}>
                  Clear All
                </Button>
              )}
            </View>

            {relationshipTypes.length > 0 && (
              <View style={styles.filterSection}>
                <Text variant="labelMedium" style={styles.filterLabel}>
                  Relationship Type:
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
              <View style={styles.filterSection}>
                <Text variant="labelMedium" style={styles.filterLabel}>
                  Tags:
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
          </Card.Content>
        </Card>
      )}

      {/* Stats */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text variant="headlineMedium">{filteredPeople.length}</Text>
              <Text variant="labelSmall">
                People{filteredPeople.length !== people.length && ` / ${people.length}`}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text variant="headlineMedium">{filteredConnections.length}</Text>
              <Text variant="labelSmall">
                Connections
                {filteredConnections.length !== connections.length && ` / ${connections.length}`}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text variant="headlineMedium">
                {filteredPeople.length > 0
                  ? ((filteredConnections.length * 2) / filteredPeople.length).toFixed(1)
                  : '0'}
              </Text>
              <Text variant="labelSmall">Avg Links</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Graph */}
      <Card style={styles.graphCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.graphTitle}>
            Connection Map
          </Text>
          <Text variant="bodySmall" style={styles.graphHint}>
            Tap a person to see their connections
          </Text>

          <View style={styles.graphContainer}>
            <Svg width={GRAPH_SIZE} height={GRAPH_SIZE}>
              {/* Draw connections */}
              {filteredConnections.map((conn) => {
                const pos1 = nodePositions[conn.person1Id];
                const pos2 = nodePositions[conn.person2Id];
                if (!pos1 || !pos2) return null;

                const isHighlighted =
                  selectedPersonId === conn.person1Id || selectedPersonId === conn.person2Id;

                return (
                  <Line
                    key={conn.id}
                    x1={pos1.x}
                    y1={pos1.y}
                    x2={pos2.x}
                    y2={pos2.y}
                    stroke={isHighlighted ? '#6200ee' : '#ccc'}
                    strokeWidth={isHighlighted ? 3 : 1}
                    opacity={selectedPersonId && !isHighlighted ? 0.2 : 1}
                  />
                );
              })}

              {/* Draw nodes */}
              {filteredPeople.map((person) => {
                const pos = nodePositions[person.id];
                if (!pos) return null;

                const nodeSize = getNodeSize(person.id);
                const isSelected = selectedPersonId === person.id;
                const isConnected = selectedConnections.some(
                  (c) => c.person1Id === person.id || c.person2Id === person.id
                );
                const shouldHighlight = !selectedPersonId || isSelected || isConnected;

                return (
                  <G
                    key={person.id}
                    onPress={() =>
                      setSelectedPersonId(isSelected ? null : person.id)
                    }
                  >
                    <Circle
                      cx={pos.x}
                      cy={pos.y}
                      r={nodeSize}
                      fill={isSelected ? '#6200ee' : '#03dac6'}
                      opacity={shouldHighlight ? 1 : 0.3}
                      stroke={isSelected ? '#fff' : 'transparent'}
                      strokeWidth={isSelected ? 3 : 0}
                    />
                    <SvgText
                      x={pos.x}
                      y={pos.y + 4}
                      fontSize={nodeSize > 20 ? 12 : 10}
                      fill="white"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {getInitials(person.name).substring(0, 2)}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#03dac6' }]} />
              <Text variant="labelSmall">Person</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6200ee' }]} />
              <Text variant="labelSmall">Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendLine} />
              <Text variant="labelSmall">Connection</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Selected person info */}
      {selectedPerson && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.infoTitle}>
              {selectedPerson.name}
            </Text>
            <View style={styles.infoChips}>
              {selectedPerson.relationshipType && (
                <Chip icon="heart" compact>
                  {selectedPerson.relationshipType}
                </Chip>
              )}
              <Chip icon="link" compact>
                {connectionStats[selectedPerson.id] || 0} connections
              </Chip>
            </View>

            {selectedConnections.length > 0 && (
              <View style={styles.connectionsList}>
                <Text variant="titleSmall" style={styles.connectionsTitle}>
                  Connected to:
                </Text>
                {selectedConnections.map((conn) => {
                  const otherId =
                    conn.person1Id === selectedPersonId ? conn.person2Id : conn.person1Id;
                  const otherPerson = people.find((p) => p.id === otherId);
                  if (!otherPerson) return null;

                  return (
                    <Chip
                      key={conn.id}
                      onPress={() => router.push(`/person/${otherPerson.id}`)}
                      style={styles.connectionChip}
                    >
                      {otherPerson.name} ({conn.relationshipType})
                    </Chip>
                  );
                })}
              </View>
            )}

            <Button
              mode="outlined"
              onPress={() => router.push(`/person/${selectedPerson.id}`)}
              style={styles.viewButton}
            >
              View Profile
            </Button>
          </Card.Content>
        </Card>
      )}

      <View style={styles.spacer} />
    </ScrollView>
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
  emptyTitle: {
    marginBottom: 12,
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 22,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.7,
  },
  filterCard: {
    margin: 16,
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    marginBottom: 8,
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    marginRight: 4,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  graphCard: {
    margin: 16,
    marginTop: 8,
  },
  graphTitle: {
    marginBottom: 4,
  },
  graphHint: {
    opacity: 0.6,
    marginBottom: 16,
  },
  graphContainer: {
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
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
  infoCard: {
    margin: 16,
    marginTop: 8,
  },
  infoTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
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
