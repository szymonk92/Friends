import { StyleSheet, View, FlatList, Alert, ScrollView, Image, StatusBar } from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Button,
  Chip,
  IconButton,
  FAB,
  Dialog,
  Portal,
  TextInput,
  SegmentedButtons,
  Menu,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
import {
  useContactEvents,
  useCreateContactEvent,
  useDeleteContactEvent,
  useUpdateContactEvent,
} from '@/hooks/useContactEvents';
import { usePeople } from '@/hooks/usePeople';
import { useRelations } from '@/hooks/useRelations';
import { useEvents } from '@/hooks/useEvents';
import { formatRelativeTime, getInitials } from '@/lib/utils/format';
import { getRelationshipColors, type RelationshipColorMap, DEFAULT_COLORS } from '@/lib/settings/relationship-colors';
import SectionDivider from '@/components/SectionDivider';
import { headerStyles, HEADER_ICON_SIZE } from '@/lib/styles/headerStyles';

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
  const [relationshipColors, setRelationshipColors] = useState<RelationshipColorMap>(DEFAULT_COLORS);

  useEffect(() => {
    getRelationshipColors().then(setRelationshipColors);
  }, []);

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
      .filter((r) => r.relationType === 'HAS_IMPORTANT_DATE' && r.validFrom)
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
    const allEvents = [...events, ...birthdayEvents, ...importantDateEvents, ...partyTimelineEvents];

    return allEvents
      .filter((event) => {
        if (filterPersonId && event.personId !== filterPersonId) return false;
        if (filterEventType && event.eventType !== filterEventType) return false;
        return true;
      })
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }, [events, birthdayEvents, importantDateEvents, partyTimelineEvents, filterPersonId, filterEventType]);

  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person?.name || 'Unknown';
  };

  const getEventIcon = (type: string) => {
    const eventConfig = EVENT_TYPES.find((e) => e.value === type);
    return eventConfig?.icon || 'calendar';
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
    setEditingEvent(event);
    setSelectedPersonId(event.personId);
    setEventType(event.eventType);
    setDateInput(new Date(event.eventDate).toISOString().split('T')[0]);
    setNotes(event.notes || '');
    setAddDialogVisible(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert('Delete Event', 'Are you sure you want to remove this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteEvent.mutateAsync(eventId),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge" style={styles.errorText}>
          Failed to load timeline
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  const renderEventItem = ({ item, index }: { item: any; index: number }) => {
    const personName = item.isPartyEvent ? (item.partyDetails?.name || 'Party') : getPersonName(item.personId);
    const person = people.find((p) => p.id === item.personId);
    const isBirthday = item.isBirthday || item.eventType === 'birthday';
    const isImportantDate = item.isImportantDate || item.eventType === 'anniversary';
    const isSpecialEvent = isBirthday || isImportantDate;
    const personColor = person?.relationshipType
      ? relationshipColors[person.relationshipType] || theme.colors.primary
      : theme.colors.primary;

    // Check if we need to show year header
    const currentYear = new Date(item.eventDate).getFullYear();
    const previousYear = index > 0 ? new Date(filteredEvents[index - 1].eventDate).getFullYear() : null;
    const nextYear = index < filteredEvents.length - 1 ? new Date(filteredEvents[index + 1].eventDate).getFullYear() : null;
    const showYearHeader = index === 0 || currentYear !== previousYear;
    const isLastInYear = nextYear !== null && currentYear !== nextYear;

    return (
      <>
        {/* Year header */}
        {showYearHeader && (
          <SectionDivider label={String(currentYear)} variant="labelLarge" marginVertical={24} />
        )}

        <View style={styles.timelineItem}>
          {/* Timeline line */}
          <View style={styles.timelineLine}>
            <View
              style={[
                styles.timelineDot,
                { backgroundColor: personColor },
                isBirthday && styles.birthdayDot,
                isImportantDate && styles.anniversaryDot,
              ]}
            />
            {index < filteredEvents.length - 1 && (
              <View style={[styles.timelineConnector, { backgroundColor: theme.colors.primary }]} />
            )}
          </View>

          {/* Event content - No card */}
          <View style={styles.eventContent}>
            {/* Person & Event Type */}
            <View style={styles.headerRow}>
              <View style={styles.personRow}>
                {item.isPartyEvent ? (
                  // Party event - show party icon
                  <View style={[styles.personAvatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.personAvatarText}>🎉</Text>
                  </View>
                ) : person ? (
                  // Regular person event
                  person.photoPath ? (
                    <View style={styles.avatarWithBorder}>
                      <Image source={{ uri: person.photoPath }} style={styles.personAvatarImage} />
                      <View style={[styles.avatarIndicator, { backgroundColor: personColor }]} />
                    </View>
                  ) : (
                    <View style={[styles.personAvatar, { backgroundColor: personColor }]}>
                      <Text style={styles.personAvatarText}>{getInitials(person.name)}</Text>
                    </View>
                  )
                ) : null}
                <View style={styles.personInfo}>
                  <Text
                    variant="titleSmall"
                    style={styles.personName}
                    onPress={() => !item.isPartyEvent && person && router.push(`/person/${person.id}`)}
                  >
                    {personName}
                  </Text>
                  <Text variant="labelSmall" style={styles.eventMeta}>
                    {getEventLabel(item.eventType)} · {formatRelativeTime(new Date(item.eventDate))}
                  </Text>
                </View>
              </View>
              
              {!isSpecialEvent && (
                <Menu
                  visible={eventMenuVisible === item.id}
                  onDismiss={() => setEventMenuVisible(null)}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={20}
                      onPress={() => setEventMenuVisible(item.id)}
                      style={styles.menuButton}
                    />
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setEventMenuVisible(null);
                      handleEditEvent(item);
                    }}
                    title="Edit"
                    leadingIcon="pencil-outline"
                  />
                  <Menu.Item
                    onPress={() => {
                      setEventMenuVisible(null);
                      handleDeleteEvent(item.id);
                    }}
                    title="Delete"
                    leadingIcon="delete-outline"
                  />
                </Menu>
              )}
            </View>

            {/* Event Notes */}
            {item.notes && (
              <Text variant="bodyMedium" style={styles.eventNotes}>
                {item.notes}
              </Text>
            )}

            {/* Party Management Buttons */}
            {item.isPartyEvent && item.partyDetails && (
              <View style={styles.partyActions}>
                <Text variant="labelSmall" style={styles.guestCount}>
                  👥 {item.guestCount} {item.guestCount === 1 ? 'guest' : 'guests'}
                </Text>
                <View style={styles.partyButtons}>
                  <Button
                    mode="outlined"
                    icon="account-plus"
                    onPress={() => router.push(`/party-planner?eventId=${item.partyDetails.id}`)}
                    style={styles.partyButton}
                    compact
                  >
                    Manage Guests
                  </Button>
                </View>
              </View>
            )}

            {/* Meta Info */}
            {(item.location || item.duration) && (
              <View style={styles.metaRow}>
                {item.location && (
                  <Text variant="labelSmall" style={styles.metaText}>
                    📍 {item.location}
                  </Text>
                )}
                {item.duration && (
                  <Text variant="labelSmall" style={styles.metaText}>
                    ⏱️ {item.duration} min
                  </Text>
                )}
              </View>
            )}

            {/* Divider - hide if last event or last in year */}
            {index < filteredEvents.length - 1 && !isLastInYear && (
              <View style={styles.eventDivider} />
            )}
          </View>
        </View>
      </>
    );
  };

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

      {/* Filters Section */}
      {filtersVisible && (
        <View style={styles.filtersSection}>
          <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {/* Person filter */}
            <Menu
              visible={personMenuVisible}
              onDismiss={() => setPersonMenuVisible(false)}
              anchor={
                <Chip
                  icon="account"
                  onPress={() => setPersonMenuVisible(true)}
                  onClose={filterPersonId ? () => setFilterPersonId(null) : undefined}
                  style={styles.filterChip}
                >
                  {filterPersonId ? getPersonName(filterPersonId) : 'All People'}
                </Chip>
              }
            >
              <Menu.Item
                onPress={() => {
                  setFilterPersonId(null);
                  setPersonMenuVisible(false);
                }}
                title="All People"
              />
              {people.map((person) => (
                <Menu.Item
                  key={person.id}
                  onPress={() => {
                    setFilterPersonId(person.id);
                    setPersonMenuVisible(false);
                  }}
                  title={person.name}
                />
              ))}
            </Menu>

            {/* Event type filters */}
            <Chip
              icon="filter-variant"
              onPress={() => setFilterEventType(null)}
              selected={!filterEventType}
              style={styles.filterChip}
            >
              All Types
            </Chip>
            {EVENT_TYPES.map((type) => (
              <Chip
                key={type.value}
                icon={type.icon}
                onPress={() => setFilterEventType(type.value)}
                selected={filterEventType === type.value}
                style={styles.filterChip}
              >
                {type.label}
              </Chip>
            ))}
          </ScrollView>
        </View>
        </View>
      )}

      {filteredEvents.length === 0 ? (
        <View style={styles.emptyState}>
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
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Add/Edit Event Dialog */}
      <Portal>
        <Dialog visible={addDialogVisible} onDismiss={closeDialog}>
          <Dialog.Title>{editingEvent ? 'Edit Timeline Event' : 'Add Timeline Event'}</Dialog.Title>
          <Dialog.Content>
            <Text variant="titleSmall" style={styles.dialogLabel}>
              Person
            </Text>
            {selectedPersonId ? (
              <View style={styles.selectedPerson}>
                <Chip onClose={() => setSelectedPersonId(null)}>
                  {getPersonName(selectedPersonId)}
                </Chip>
              </View>
            ) : (
              <View style={styles.personList}>
                {people.slice(0, 5).map((person) => (
                  <Chip
                    key={person.id}
                    onPress={() => setSelectedPersonId(person.id)}
                    style={styles.personChip}
                  >
                    {person.name}
                  </Chip>
                ))}
                {people.length > 5 && (
                  <Text variant="labelSmall" style={styles.moreText}>
                    + {people.length - 5} more
                  </Text>
                )}
              </View>
            )}

            <Text variant="titleSmall" style={styles.dialogLabel}>
              Event Type
            </Text>
            <SegmentedButtons
              value={eventType}
              onValueChange={setEventType}
              buttons={EVENT_TYPES.slice(0, 3)}
              style={styles.segmented}
            />
            <SegmentedButtons
              value={eventType}
              onValueChange={setEventType}
              buttons={EVENT_TYPES.slice(3)}
              style={styles.segmented}
            />

            <Text variant="titleSmall" style={styles.dialogLabel}>
              Event Date (YYYY, YYYY-MM, or YYYY-MM-DD)
            </Text>
            <TextInput
              mode="outlined"
              label="Date"
              placeholder="2024 or 2024-03 or 2024-03-15"
              value={dateInput}
              onChangeText={setDateInput}
              style={styles.dateInput}
            />

            <TextInput
              mode="outlined"
              label="Notes (optional)"
              placeholder="What happened?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancel</Button>
            <Button onPress={handleAddEvent} loading={isSubmitting} disabled={isSubmitting}>
              {editingEvent ? 'Save' : 'Add'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  filtersSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filtersContainer: {
    marginTop: 0,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    marginRight: 8,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },

  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineLine: {
    width: 30,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 20,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  birthdayDot: {
    backgroundColor: '#ff9800',
  },
  anniversaryDot: {
    backgroundColor: '#e91e63',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    opacity: 0.2,
    marginTop: 6,
  },
  eventContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 20,
  },
  eventDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginTop: 16,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  personInfo: {
    flex: 1,
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  avatarWithBorder: {
    position: 'relative',
    marginRight: 12,
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
  personAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  personName: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 3,
    color: '#1a1a1a',
  },
  eventMeta: {
    opacity: 0.5,
    fontSize: 12,
  },
  menuButton: {
    margin: 0,
    marginTop: -8,
    marginRight: -8,
  },
  eventNotes: {
    lineHeight: 21,
    color: '#4a4a4a',
    fontSize: 14,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  metaText: {
    opacity: 0.55,
    fontSize: 12,
  },
  partyActions: {
    marginTop: 12,
    marginBottom: 8,
  },
  guestCount: {
    opacity: 0.7,
    marginBottom: 8,
  },
  partyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  partyButton: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  dialogLabel: {
    marginBottom: 8,
    marginTop: 12,
  },
  selectedPerson: {
    marginBottom: 8,
  },
  personList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  personChip: {
    marginBottom: 4,
  },
  moreText: {
    opacity: 0.6,
    alignSelf: 'center',
  },
  segmented: {
    marginBottom: 8,
  },
  notesInput: {
    marginTop: 8,
  },
  dateInput: {
    marginBottom: 8,
  },
});
