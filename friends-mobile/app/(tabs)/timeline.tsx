import { StyleSheet, View, FlatList, Alert } from 'react-native';
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
} from 'react-native-paper';
import { useState } from 'react';
import { router } from 'expo-router';
import {
  useContactEvents,
  useCreateContactEvent,
  useDeleteContactEvent,
  useUpdateContactEvent,
} from '@/hooks/useContactEvents';
import { usePeople } from '@/hooks/usePeople';
import { formatRelativeTime, getInitials } from '@/lib/utils/format';

const EVENT_TYPES = [
  { value: 'met', label: 'Met', icon: 'account-check' },
  { value: 'called', label: 'Called', icon: 'phone' },
  { value: 'messaged', label: 'Messaged', icon: 'message' },
  { value: 'hung_out', label: 'Hung Out', icon: 'coffee' },
  { value: 'special', label: 'Special Event', icon: 'star' },
];

export default function TimelineScreen() {
  const { data: events = [], isLoading, error, refetch } = useContactEvents();
  const { data: people = [] } = usePeople();
  const createEvent = useCreateContactEvent();
  const deleteEvent = useDeleteContactEvent();
  const updateEvent = useUpdateContactEvent();

  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [eventType, setEventType] = useState('met');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]); // Flexible: YYYY, YYYY-MM, or YYYY-MM-DD
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const personName = getPersonName(item.personId);
    const person = people.find((p) => p.id === item.personId);

    return (
      <View style={styles.timelineItem}>
        {/* Timeline line */}
        <View style={styles.timelineLine}>
          <View style={styles.timelineDot} />
          {index < events.length - 1 && <View style={styles.timelineConnector} />}
        </View>

        {/* Event card */}
        <Card style={styles.eventCard}>
          <Card.Content>
            <View style={styles.eventHeader}>
              <View style={styles.eventInfo}>
                <Chip icon={getEventIcon(item.eventType)} compact>
                  {getEventLabel(item.eventType)}
                </Chip>
                <Text variant="labelSmall" style={styles.eventDate}>
                  {formatRelativeTime(new Date(item.eventDate))}
                </Text>
              </View>
              <View style={styles.eventActions}>
                <IconButton
                  icon="pencil-outline"
                  size={20}
                  onPress={() => handleEditEvent(item)}
                />
                <IconButton
                  icon="delete-outline"
                  size={20}
                  onPress={() => handleDeleteEvent(item.id)}
                />
              </View>
            </View>

            <View style={styles.personRow}>
              {person && (
                <View style={styles.personAvatar}>
                  <Text style={styles.personAvatarText}>{getInitials(person.name)}</Text>
                </View>
              )}
              <Text
                variant="titleMedium"
                style={styles.personName}
                onPress={() => person && router.push(`/person/${person.id}`)}
              >
                {personName}
              </Text>
            </View>

            {item.notes && (
              <Text variant="bodyMedium" style={styles.eventNotes}>
                {item.notes}
              </Text>
            )}

            {item.location && (
              <Text variant="labelSmall" style={styles.eventLocation}>
                📍 {item.location}
              </Text>
            )}

            {item.duration && (
              <Text variant="labelSmall" style={styles.eventDuration}>
                ⏱️ {item.duration} minutes
              </Text>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Timeline
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Track your interactions with people
        </Text>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="titleLarge" style={styles.emptyTitle}>
            No events yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyDescription}>
            Start tracking when you meet, call, or interact with people in your network.
          </Text>
          <Button mode="contained" onPress={() => setAddDialogVisible(true)}>
            Add First Event
          </Button>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={() => setAddDialogVisible(true)} />

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
  errorText: {
    marginBottom: 16,
    color: '#d32f2f',
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
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLine: {
    width: 30,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6200ee',
    marginTop: 16,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#6200ee',
    opacity: 0.3,
    marginTop: 4,
  },
  eventCard: {
    flex: 1,
    marginLeft: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventActions: {
    flexDirection: 'row',
  },
  eventDate: {
    opacity: 0.6,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  personAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  personAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  personName: {
    fontWeight: '600',
    color: '#6200ee',
  },
  eventNotes: {
    marginTop: 4,
    lineHeight: 20,
  },
  eventLocation: {
    marginTop: 8,
    opacity: 0.7,
  },
  eventDuration: {
    marginTop: 4,
    opacity: 0.7,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
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
