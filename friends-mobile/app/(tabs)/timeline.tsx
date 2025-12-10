import CenteredContainer from '@/components/CenteredContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useMemo, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { View, StyleSheet, StatusBar, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Text, Button, IconButton, useTheme } from 'react-native-paper';
import {
  useContactEvents,
  useCreateContactEvent,
  useDeleteContactEvent,
  useUpdateContactEvent,
} from '@/hooks/useContactEvents';
import { usePeople } from '@/hooks/usePeople';
import { useRelations } from '@/hooks/useRelations';
import { useEvents, useDeleteEvent } from '@/hooks/useEvents';
import {
  getRelationshipColors,
  type RelationshipColorMap,
  DEFAULT_COLORS,
} from '@/lib/settings/relationship-colors';
import { headerStyles, HEADER_ICON_SIZE } from '@/lib/styles/headerStyles';
import { HAS_IMPORTANT_DATE } from '@/lib/constants/relations';

import TimelineEventItem from '@/components/timeline/TimelineEventItem';
import TimelineFilters from '@/components/timeline/TimelineFilters';
import AddEventDialog from '@/components/timeline/AddEventDialog';

const EVENT_TYPES = [
  { value: 'met', label: 'Met', icon: 'account-check' },
  { value: 'called', label: 'Called', icon: 'phone' },
  { value: 'messaged', label: 'Messaged', icon: 'message' },
  { value: 'hung_out', label: 'Hung Out', icon: 'coffee' },
  { value: 'special', label: 'Special Event', icon: 'star' },
  { value: 'birthday', label: 'Birthday', icon: 'cake-variant' },
  { value: 'anniversary', label: 'Anniversary', icon: 'calendar-star' },
  { value: 'party', label: 'Party', icon: 'party-popper' },
  { value: 'dinner', label: 'Dinner', icon: 'silverware-fork-knife' },
  { value: 'gathering', label: 'Gathering', icon: 'account-group' },
];

export default function TimelineScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: events = [], isLoading, error, refetch } = useContactEvents();
  const { data: people = [] } = usePeople();
  const { data: allRelations = [] } = useRelations();
  const { data: partyEvents = [] } = useEvents();
  const createEvent = useCreateContactEvent();
  const deleteEvent = useDeleteContactEvent();
  const deletePartyEvent = useDeleteEvent();
  const updateEvent = useUpdateContactEvent();

  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [eventType, setEventType] = useState('met');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [filterPersonId, setFilterPersonId] = useState<string | null>(null);
  const [filterEventType, setFilterEventType] = useState<string | null>(null);
  const [personMenuVisible, setPersonMenuVisible] = useState(false);
  const [eventMenuVisible, setEventMenuVisible] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Relationship colors
  const [relationshipColors, setRelationshipColors] =
    useState<RelationshipColorMap>(DEFAULT_COLORS);

  useFocusEffect(
    useCallback(() => {
      getRelationshipColors().then(setRelationshipColors);
    }, [])
  );

  // Generate birthday events from people with birthday
  const birthdayEvents = useMemo(() => {
    return people
      .filter((p) => p.dateOfBirth)
      .map((p) => ({
        id: `birthday-${p.id}`,
        personId: p.id,
        eventType: 'birthday',
        eventDate: p.dateOfBirth!,
        notes: `${p.name}'s birthday`,
        isBirthday: true,
      }));
  }, [people]);

  // Generate important date events from relations
  const importantDateEvents = useMemo(() => {
    return allRelations
      .filter((r) => r.relationType === HAS_IMPORTANT_DATE && r.validFrom)
      .map((r) => ({
        id: `important-${r.id}`,
        personId: r.subjectId,
        eventType: 'anniversary',
        eventDate: r.validFrom,
        notes: r.objectLabel,
        isImportantDate: true,
      }));
  }, [allRelations]);

  // Transform party/gathering events into timeline format
  const partyTimelineEvents = useMemo(() => {
    return partyEvents
      .filter((event) => event.eventDate)
      .map((event) => {
        // Parse guest IDs from JSON
        const guestIds: string[] = event.guestIds ? JSON.parse(event.guestIds) : [];
        const guestNames = guestIds.map((gid) => {
          const person = people.find((p) => p.id === gid);
          return person?.name || 'Unknown';
        });

        // Create ONE event for the entire party
        return {
          id: `party-${event.id}`,
          personId: null as any, // No specific person - it's a group event
          eventType: event.eventType || 'party',
          eventDate: event.eventDate,
          notes: `${event.name || 'Party'}${guestIds.length > 0 ? ` with ${guestNames.slice(0, 3).join(', ')}${guestNames.length > 3 ? ` and ${guestNames.length - 3} more` : ''}` : ''}${event.location ? ` at ${event.location}` : ''}`,
          isPartyEvent: true,
          partyDetails: event,
          guestCount: guestIds.length,
          guestNames,
        };
      });
  }, [partyEvents, people]);

  // Combine and filter events
  const filteredEvents = useMemo(() => {
    const allEvents = [
      ...events,
      ...birthdayEvents,
      ...importantDateEvents,
      ...partyTimelineEvents,
    ];

    return allEvents
      .filter((event) => {
        if (filterPersonId && event.personId !== filterPersonId) return false;
        if (filterEventType && event.eventType !== filterEventType) return false;
        // Ensure event has a valid date
        if (!event.eventDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.eventDate!).getTime() - new Date(a.eventDate!).getTime());
  }, [
    events,
    birthdayEvents,
    importantDateEvents,
    partyTimelineEvents,
    filterPersonId,
    filterEventType,
  ]);

  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person?.name || 'Unknown';
  };

  const getEventLabel = (type: string) => {
    const eventConfig = EVENT_TYPES.find((e) => e.value === type);
    return eventConfig?.label || type;
  };

  const parseFlexibleDate = (input: string): Date | null => {
    const trimmed = input.trim();
    const parts = trimmed.split('-').map((p) => parseInt(p, 10));

    if (parts.length === 1 && parts[0] >= 1900 && parts[0] <= 2100) {
      // Year only: YYYY -> Jan 1st of that year
      return new Date(parts[0], 0, 1);
    } else if (parts.length === 2 && parts[0] >= 1900 && parts[1] >= 1 && parts[1] <= 12) {
      // Year-Month: YYYY-MM -> 1st of that month
      return new Date(parts[0], parts[1] - 1, 1);
    } else if (parts.length === 3 && parts[0] >= 1900 && parts[1] >= 1 && parts[2] >= 1) {
      // Full date: YYYY-MM-DD
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  };

  const handleAddEvent = async () => {
    if (!selectedPersonId) {
      Alert.alert('Select Person', 'Please select a person for this event');
      return;
    }

    const parsedDate = parseFlexibleDate(dateInput);
    if (!parsedDate) {
      Alert.alert('Invalid Date', 'Enter date as YYYY, YYYY-MM, or YYYY-MM-DD');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEvent) {
        await updateEvent.mutateAsync({
          id: editingEvent.id,
          personId: selectedPersonId,
          eventType: eventType as any,
          notes: notes.trim() || undefined,
          eventDate: parsedDate,
        });
        Alert.alert('Success', 'Event updated!');
      } else {
        await createEvent.mutateAsync({
          personId: selectedPersonId,
          eventType: eventType as any,
          notes: notes.trim() || undefined,
          eventDate: parsedDate,
        });
        Alert.alert('Success', 'Event added to timeline!');
      }

      closeDialog();
    } catch (err) {
      Alert.alert('Error', editingEvent ? 'Failed to update event' : 'Failed to add event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = () => {
    setAddDialogVisible(false);
    setEditingEvent(null);
    setSelectedPersonId(null);
    setEventType('met');
    setDateInput(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  const handleEditEvent = (event: any) => {
    // Check if this is a party event
    if (event.isPartyEvent && event.partyDetails) {
      // Navigate to party-planner screen with the actual event ID (without 'party-' prefix)
      const actualEventId = event.id.replace('party-', '');
      router.push(`/party-planner?eventId=${actualEventId}`);
    } else {
      // Regular contact event - show dialog
      setEditingEvent(event);
      setSelectedPersonId(event.personId);
      setEventType(event.eventType);
      setDateInput(
        event.eventDate
          ? new Date(event.eventDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setNotes(event.notes || '');
      setAddDialogVisible(true);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    // Check if this is a party event (starts with "party-")
    const isPartyEvent = eventId.startsWith('party-');

    const eventType = isPartyEvent ? 'party' : 'event';
    const deleteFunction = isPartyEvent ? deletePartyEvent : deleteEvent;
    const actualEventId = isPartyEvent ? eventId.replace('party-', '') : eventId;

    Alert.alert(
      `Delete ${eventType === 'party' ? 'Party' : 'Event'}`,
      `Are you sure you want to remove this ${eventType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteFunction.mutateAsync(actualEventId),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <CenteredContainer style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </CenteredContainer>
    );
  }

  if (error) {
    return (
      <CenteredContainer style={styles.centered}>
        <Text variant="bodyLarge" style={styles.errorText}>
          Failed to load timeline
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </CenteredContainer>
    );
  }

  const hasActiveFilters = filterPersonId || filterEventType;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(255, 255, 255, 0.8)" translucent />

      {/* Custom Header - Android Contacts Style */}
      <View style={[headerStyles.header, { paddingTop: insets.top }]}>
        <View style={headerStyles.headerContent}>
          <Text variant="headlineMedium" style={headerStyles.headerTitle}>
            Timeline
          </Text>
          <View style={headerStyles.headerActions}>
            <IconButton
              icon="plus"
              size={HEADER_ICON_SIZE}
              style={headerStyles.headerIcon}
              onPress={() => setAddDialogVisible(true)}
            />
            <IconButton
              icon={filtersVisible ? 'filter-variant' : 'filter-variant-remove'}
              size={HEADER_ICON_SIZE}
              onPress={() => setFiltersVisible(!filtersVisible)}
              iconColor={hasActiveFilters ? '#6200ee' : undefined}
            />
          </View>
        </View>
      </View>

      <TimelineFilters
        filtersVisible={filtersVisible}
        filterPersonId={filterPersonId}
        setFilterPersonId={setFilterPersonId}
        filterEventType={filterEventType}
        setFilterEventType={setFilterEventType}
        personMenuVisible={personMenuVisible}
        setPersonMenuVisible={setPersonMenuVisible}
        people={people}
        eventTypes={EVENT_TYPES}
        getPersonName={getPersonName}
      />

      {filteredEvents.length === 0 ? (
        <CenteredContainer style={styles.emptyState}>
          <Text variant="titleLarge" style={styles.emptyTitle}>
            {filterPersonId || filterEventType ? 'No matching events' : 'No events yet'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyDescription}>
            {filterPersonId || filterEventType
              ? 'Try adjusting your filters or add new events.'
              : 'Start tracking when you meet, call, or interact with people in your network.'}
          </Text>
          {!filterPersonId && !filterEventType && (
            <Button mode="contained" onPress={() => setAddDialogVisible(true)}>
              Add First Event
            </Button>
          )}
          {(filterPersonId || filterEventType) && (
            <Button
              mode="outlined"
              onPress={() => {
                setFilterPersonId(null);
                setFilterEventType(null);
              }}
            >
              Clear Filters
            </Button>
          )}
        </CenteredContainer>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={({ item, index }) => (
            <TimelineEventItem
              item={item}
              index={index}
              filteredEvents={filteredEvents}
              people={people}
              relationshipColors={relationshipColors}
              theme={theme}
              eventMenuVisible={eventMenuVisible}
              setEventMenuVisible={setEventMenuVisible}
              handleEditEvent={handleEditEvent}
              handleDeleteEvent={handleDeleteEvent}
              getPersonName={getPersonName}
              getEventLabel={getEventLabel}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <AddEventDialog
        visible={addDialogVisible}
        onDismiss={closeDialog}
        editingEvent={editingEvent}
        selectedPersonId={selectedPersonId}
        setSelectedPersonId={setSelectedPersonId}
        people={people}
        getPersonName={getPersonName}
        eventType={eventType}
        setEventType={setEventType}
        eventTypes={EVENT_TYPES}
        dateInput={dateInput}
        setDateInput={setDateInput}
        notes={notes}
        setNotes={setNotes}
        isSubmitting={isSubmitting}
        handleAddEvent={handleAddEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    marginBottom: 16,
    color: '#d32f2f',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyState: {
    padding: 24,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
});
