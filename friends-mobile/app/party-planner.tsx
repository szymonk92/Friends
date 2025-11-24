import { useState, useMemo, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert, View } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePeople } from '@/hooks/usePeople';
import { useRelations } from '@/hooks/useRelations';
import { useCreateEvent, useEvents, useUpdateEvent } from '@/hooks/useEvents';
import { LIKES, DISLIKES } from '@/lib/constants/relations';
import { getRelationshipColors, DEFAULT_COLORS } from '@/lib/settings/relationship-colors';

import PartyDetailsForm from '@/components/party/PartyDetailsForm';
import GuestSelector from '@/components/party/GuestSelector';
import PartySuggestions from '@/components/party/PartySuggestions';

interface Guest {
  id: string;
  name: string;
  likes: string[];
  dislikes: string[];
}

export default function PartyPlannerScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const eventId = params.eventId as string | undefined;
  const initialMode = (params.mode as string) === 'party';

  const { data: allPeople = [] } = usePeople();
  const { data: allRelations = [] } = useRelations();
  const { data: allEvents = [] } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [partyName, setPartyName] = useState('');
  const [partyDate, setPartyDate] = useState('');
  const [partyLocation, setPartyLocation] = useState('');
  const [partyType, setPartyType] = useState<'dinner' | 'party' | 'gathering'>('dinner');
  const [relationshipColors, setRelationshipColors] = useState(DEFAULT_COLORS);

  useEffect(() => {
    getRelationshipColors().then(setRelationshipColors);
  }, []);

  // Load existing event if eventId provided
  useEffect(() => {
    if (eventId) {
      const event = allEvents.find((e) => e.id === eventId);
      if (event) {
        setPartyName(event.name || '');
        setPartyDate(event.eventDate ? event.eventDate.toISOString().split('T')[0] : '');
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
        .filter((r) => r.relationType === LIKES)
        .map((r) => r.objectLabel);

      const dislikes = personRelations
        .filter((r) => r.relationType === DISLIKES)
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

    const eventData = {
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
      status: 'planned' as const,
    };

    try {
      if (eventId) {
        // Update existing event
        await updateEvent.mutateAsync({
          id: eventId,
          ...eventData,
        });

        Alert.alert('Party Updated!', `${partyName} has been updated.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        // Create new event
        await createEvent.mutateAsync(eventData);

        Alert.alert('Party Created!', `${partyName} has been saved with ${selectedGuests.length} guests.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${eventId ? 'update' : 'create'} party. Please try again.`);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: eventId ? 'Update Party' : 'Plan a Party' }} />
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <PartyDetailsForm
          name={partyName}
          setName={setPartyName}
          type={partyType}
          setType={setPartyType}
          date={partyDate}
          setDate={setPartyDate}
          location={partyLocation}
          setLocation={setPartyLocation}
        />

        <GuestSelector
          selectedGuests={selectedGuests}
          onToggleGuest={toggleGuest}
          people={filteredPeople}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          relationshipColors={relationshipColors}
        />

        {selectedGuests.length >= 2 && (
          <PartySuggestions
            guestData={guestData}
            foodSuggestions={foodSuggestions}
            seatingArrangement={seatingArrangement}
            initialShow={initialMode}
          />
        )}

        {/* Create Button */}
        <Button
          mode="contained"
          onPress={handleCreateParty}
          style={styles.createButton}
          loading={createEvent.isPending || updateEvent.isPending}
          disabled={(createEvent.isPending || updateEvent.isPending) || !partyName.trim() || selectedGuests.length === 0}
          icon="party-popper"
        >
          {eventId ? 'Update Party' : 'Create Party'}
        </Button>

        <View style={styles.spacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  createButton: {
    margin: 16,
    paddingVertical: 8,
  },
  spacer: {
    height: 40,
  },
});
