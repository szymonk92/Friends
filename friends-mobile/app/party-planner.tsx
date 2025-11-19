import { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Searchbar,
  List,
  Divider,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePeople } from '@/hooks/usePeople';
import { useRelations } from '@/hooks/useRelations';
import { useCreateEvent, useEvents } from '@/hooks/useEvents';
import { getInitials, formatRelationType } from '@/lib/utils/format';

interface Guest {
  id: string;
  name: string;
  likes: string[];
  dislikes: string[];
}

export default function PartyPlannerScreen() {
  const params = useLocalSearchParams();
  const eventId = params.eventId as string | undefined;
  const initialMode = (params.mode as string) === 'party';

  const { data: allPeople = [] } = usePeople();
  const { data: allRelations = [] } = useRelations();
  const { data: allEvents = [] } = useEvents();
  const createEvent = useCreateEvent();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [partyName, setPartyName] = useState('');
  const [partyDate, setPartyDate] = useState('');
  const [partyLocation, setPartyLocation] = useState('');
  const [partyType, setPartyType] = useState<'dinner' | 'party' | 'gathering'>('dinner');
  const [showSuggestions, setShowSuggestions] = useState(initialMode);

  // Load existing event if eventId provided
  useEffect(() => {
    if (eventId) {
      const event = allEvents.find((e) => e.id === eventId);
      if (event) {
        setPartyName(event.name || '');
        setPartyDate(event.eventDate || '');
        setPartyLocation(event.location || '');
        setPartyType((event.eventType as any) || 'party');
        
        // Load guests
        if (event.guestIds) {
          try {
            const guestIds = JSON.parse(event.guestIds);
            setSelectedGuests(guestIds);
          } catch (e) {
            console.error('Failed to parse guest IDs:', e);
          }
        }
      }
    }
  }, [eventId, allEvents]);

  // Filter primary people
  const primaryPeople = allPeople.filter((p) => p.personType === 'primary');

  // Filter by search with ranking
  const filteredPeople = primaryPeople
    .filter((p) => {
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      const name = p.name.toLowerCase();

      if (name === query) return true; // Exact match
      if (name.startsWith(query)) return true; // Starts with
      if (name.includes(query)) return true; // Contains

      return false;
    })
    .sort((a, b) => {
      // Sort selected people to the end
      const aSelected = selectedGuests.includes(a.id);
      const bSelected = selectedGuests.includes(b.id);
      
      if (aSelected !== bSelected) {
        return aSelected ? 1 : -1; // Selected go to end
      }

      // Then sort by search score
      if (!searchQuery) return 0;

      const query = searchQuery.toLowerCase();
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Calculate scores
      const getScore = (name: string) => {
        if (name === query) return 3;
        if (name.startsWith(query)) return 2;
        if (name.includes(query)) return 1;
        return 0;
      };

      const aScore = getScore(aName);
      const bScore = getScore(bName);

      return bScore - aScore; // Higher score first
    });

  // Get guest data with their preferences
  const guestData: Guest[] = useMemo(() => {
    return selectedGuests.map((guestId) => {
      const person = primaryPeople.find((p) => p.id === guestId);
      const personRelations = allRelations.filter((r) => r.subjectId === guestId);

      const likes = personRelations
        .filter((r) => r.relationType === 'LIKES')
        .map((r) => r.objectLabel);

      const dislikes = personRelations
        .filter((r) => r.relationType === 'DISLIKES')
        .map((r) => r.objectLabel);

      return {
        id: guestId,
        name: person?.name || 'Unknown',
        likes,
        dislikes,
      };
    });
  }, [selectedGuests, primaryPeople, allRelations]);

  // Calculate food suggestions (common likes, avoid common dislikes)
  const foodSuggestions = useMemo(() => {
    if (guestData.length === 0) return { recommended: [], avoid: [] };

    const allLikes: Record<string, number> = {};
    const allDislikes: Record<string, number> = {};

    guestData.forEach((guest) => {
      guest.likes.forEach((like) => {
        allLikes[like] = (allLikes[like] || 0) + 1;
      });
      guest.dislikes.forEach((dislike) => {
        allDislikes[dislike] = (allDislikes[dislike] || 0) + 1;
      });
    });

    // Foods liked by majority
    const recommended = Object.entries(allLikes)
      .filter(([_, count]) => count >= guestData.length / 2)
      .sort((a, b) => b[1] - a[1])
      .map(([food, count]) => ({ food, count }));

    // Foods disliked by anyone
    const avoid = Object.entries(allDislikes)
      .sort((a, b) => b[1] - a[1])
      .map(([food, count]) => ({ food, count }));

    return { recommended, avoid };
  }, [guestData]);

  // Calculate seating suggestions based on connections and preferences
  const seatingArrangement = useMemo(() => {
    if (guestData.length < 2) return [];

    // Simple algorithm: pair people with similar likes
    const pairs: Array<{ person1: string; person2: string; score: number; reason: string }> = [];

    for (let i = 0; i < guestData.length; i++) {
      for (let j = i + 1; j < guestData.length; j++) {
        const guest1 = guestData[i];
        const guest2 = guestData[j];

        // Calculate compatibility score
        const commonLikes = guest1.likes.filter((like) => guest2.likes.includes(like));
        const commonDislikes = guest1.dislikes.filter((dislike) =>
          guest2.dislikes.includes(dislike)
        );

        const score = commonLikes.length * 2 + commonDislikes.length;

        if (score > 0) {
          const reasons = [];
          if (commonLikes.length > 0)
            reasons.push(`both like ${commonLikes.slice(0, 2).join(', ')}`);
          if (commonDislikes.length > 0)
            reasons.push(`both avoid ${commonDislikes.slice(0, 2).join(', ')}`);

          pairs.push({
            person1: guest1.name,
            person2: guest2.name,
            score,
            reason: reasons.join('; '),
          });
        }
      }
    }

    return pairs.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [guestData]);

  const toggleGuest = (personId: string) => {
    setSelectedGuests((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const handleCreateParty = async () => {
    if (!partyName.trim()) {
      Alert.alert('Missing Information', 'Please enter a party name.');
      return;
    }
    if (selectedGuests.length === 0) {
      Alert.alert('Missing Information', 'Please select at least one guest.');
      return;
    }

    try {
      await createEvent.mutateAsync({
        name: partyName,
        eventType: partyType,
        eventDate: partyDate ? new Date(partyDate) : new Date(),
        location: partyLocation || undefined,
        guestIds: JSON.stringify(selectedGuests),
        menuSuggestions: JSON.stringify(foodSuggestions),
        seatingArrangement: JSON.stringify(seatingArrangement),
        warnings: JSON.stringify(
          foodSuggestions.avoid.map((item) => `${item.count} guest(s) dislike ${item.food}`)
        ),
        status: 'planned',
      });

      Alert.alert('Party Created!', `${partyName} has been saved with ${selectedGuests.length} guests.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create party. Please try again.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Plan a Party' }} />
      <ScrollView style={styles.container}>
        {/* Party Details */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Party Details
            </Text>

            <TextInput
              label="Party Name"
              value={partyName}
              onChangeText={setPartyName}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Summer BBQ, Birthday Dinner"
            />

            <SegmentedButtons
              value={partyType}
              onValueChange={(v) => setPartyType(v as any)}
              buttons={[
                { value: 'dinner', label: 'Dinner' },
                { value: 'party', label: 'Party' },
                { value: 'gathering', label: 'Gathering' },
              ]}
              style={styles.segmentedButton}
            />

            <TextInput
              label="Date (YYYY-MM-DD)"
              value={partyDate}
              onChangeText={setPartyDate}
              mode="outlined"
              style={styles.input}
              placeholder="2024-12-25"
            />

            <TextInput
              label="Location"
              value={partyLocation}
              onChangeText={setPartyLocation}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., My place, Restaurant name"
            />
          </Card.Content>
        </Card>

        {/* Guest Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Select Guests ({selectedGuests.length})
            </Text>

            <Searchbar
              placeholder="Search people..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
            />

            {/* Selected guests chips */}
            {selectedGuests.length > 0 && (
              <View style={styles.selectedChips}>
                {guestData.map((guest) => (
                  <Chip
                    key={guest.id}
                    onClose={() => toggleGuest(guest.id)}
                    style={styles.guestChip}
                  >
                    {guest.name}
                  </Chip>
                ))}
              </View>
            )}

            <Divider style={styles.divider} />

            {/* People list */}
            <View style={styles.peopleList}>
              {filteredPeople.slice(0, 10).map((person) => (
                <List.Item
                  key={person.id}
                  title={person.name}
                  left={() => (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
                    </View>
                  )}
                  right={() => (
                    <Chip
                      selected={selectedGuests.includes(person.id)}
                      onPress={() => toggleGuest(person.id)}
                      style={styles.selectChip}
                    >
                      {selectedGuests.includes(person.id) ? 'Selected' : 'Add'}
                    </Chip>
                  )}
                  style={styles.personItem}
                />
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Suggestions */}
        {selectedGuests.length >= 2 && (
          <Card style={styles.card}>
            <Card.Content>
              <Button
                mode="text"
                onPress={() => setShowSuggestions(!showSuggestions)}
                icon={showSuggestions ? 'chevron-up' : 'chevron-down'}
              >
                {showSuggestions ? 'Hide' : 'Show'} Suggestions
              </Button>

              {showSuggestions && (
                <>
                  {/* Food Recommendations */}
                  <Text variant="titleMedium" style={styles.suggestionTitle}>
                    🍽️ Food Recommendations
                  </Text>
                  {foodSuggestions.recommended.length > 0 ? (
                    <View style={styles.foodChips}>
                      {foodSuggestions.recommended.slice(0, 8).map((item) => (
                        <Chip key={item.food} icon="thumb-up" style={styles.recommendChip}>
                          {item.food} ({item.count}/{guestData.length})
                        </Chip>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noDataText}>No common preferences found</Text>
                  )}

                  {/* Foods to Avoid */}
                  {foodSuggestions.avoid.length > 0 && (
                    <>
                      <Text variant="titleMedium" style={styles.suggestionTitle}>
                        ⚠️ Foods to Avoid
                      </Text>
                      <View style={styles.foodChips}>
                        {foodSuggestions.avoid.slice(0, 8).map((item) => (
                          <Chip key={item.food} icon="alert" style={styles.avoidChip}>
                            {item.food} ({item.count} dislike)
                          </Chip>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Seating Suggestions */}
                  <Text variant="titleMedium" style={styles.suggestionTitle}>
                    🪑 Seating Suggestions
                  </Text>
                  {seatingArrangement.length > 0 ? (
                    seatingArrangement.map((pair, index) => (
                      <View key={index} style={styles.seatingPair}>
                        <Text variant="bodyLarge">
                          {pair.person1} ↔️ {pair.person2}
                        </Text>
                        <Text variant="bodySmall" style={styles.seatingReason}>
                          {pair.reason}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noDataText}>
                      Not enough preference data for seating suggestions
                    </Text>
                  )}

                  {/* Guest Preferences */}
                  <Text variant="titleMedium" style={styles.suggestionTitle}>
                    👥 Guest Preferences
                  </Text>
                  {guestData.map((guest) => (
                    <View key={guest.id} style={styles.guestPreferences}>
                      <Text variant="titleSmall">{guest.name}</Text>
                      {guest.likes.length > 0 && (
                        <View style={styles.prefRow}>
                          <Text style={styles.prefLabel}>Likes:</Text>
                          <Text style={styles.prefItems}>{guest.likes.slice(0, 5).join(', ')}</Text>
                        </View>
                      )}
                      {guest.dislikes.length > 0 && (
                        <View style={styles.prefRow}>
                          <Text style={styles.prefLabel}>Dislikes:</Text>
                          <Text style={styles.prefItemsRed}>
                            {guest.dislikes.slice(0, 5).join(', ')}
                          </Text>
                        </View>
                      )}
                      {guest.likes.length === 0 && guest.dislikes.length === 0 && (
                        <Text style={styles.noDataText}>No preferences recorded</Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Create Button */}
        <Button
          mode="contained"
          onPress={handleCreateParty}
          style={styles.createButton}
          loading={createEvent.isPending}
          disabled={createEvent.isPending || !partyName.trim() || selectedGuests.length === 0}
          icon="party-popper"
        >
          Create Party
        </Button>

        <View style={styles.spacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
  },
  segmentedButton: {
    marginBottom: 12,
  },
  searchbar: {
    marginBottom: 12,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  guestChip: {
    backgroundColor: '#e3f2fd',
  },
  divider: {
    marginVertical: 8,
  },
  peopleList: {
    maxHeight: 300,
  },
  personItem: {
    paddingVertical: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectChip: {
    marginRight: 8,
  },
  suggestionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  foodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recommendChip: {
    backgroundColor: '#c8e6c9',
    marginBottom: 4,
  },
  avoidChip: {
    backgroundColor: '#ffcdd2',
    marginBottom: 4,
  },
  seatingPair: {
    backgroundColor: '#f3e5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  seatingReason: {
    opacity: 0.7,
    marginTop: 4,
  },
  guestPreferences: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  prefRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  prefLabel: {
    fontWeight: 'bold',
    marginRight: 8,
    opacity: 0.8,
  },
  prefItems: {
    flex: 1,
    color: '#2e7d32',
  },
  prefItemsRed: {
    flex: 1,
    color: '#c62828',
  },
  noDataText: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  createButton: {
    margin: 16,
    paddingVertical: 8,
  },
  spacer: {
    height: 40,
  },
});
