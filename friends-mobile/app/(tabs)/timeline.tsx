import CenteredContainer from '@/components/CenteredContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { View, StyleSheet, StatusBar, Alert, ActivityIndicator, FlatList } from 'react-native';
import { confirmDestructive } from '@/lib/utils/confirm';
import { Text, Button } from 'react-native-paper';
import {
  useContactEvents,
  useCreateContactEvent,
  useDeleteContactEvent,
  useUpdateContactEvent,
} from '@/hooks/useContactEvents';
import { usePeople } from '@/hooks/usePeople';
import { useRelations } from '@/hooks/useRelations';
import { useEvents, useDeleteEvent } from '@/hooks/useEvents';
import { HAS_IMPORTANT_DATE } from '@/lib/constants/relations';

import TimelineEventItem from '@/components/timeline/TimelineEventItem';
import TimelineFilters from '@/components/timeline/TimelineFilters';
import AddEventDialog from '@/components/timeline/AddEventDialog';
import { parseFlexibleDate } from '@/lib/utils/dates';
import { parseJsonArray } from '@/lib/utils/json';
import { fz, fzText } from '@/lib/design/tokens';
import { IconCircle } from '@/components/IconCircle';
import { useTranslation } from 'react-i18next';

const EVENT_TYPES = [
  { value: 'met' as const, icon: 'account-check' },
  { value: 'called' as const, icon: 'phone' },
  { value: 'messaged' as const, icon: 'message' },
  { value: 'hung_out' as const, icon: 'coffee' },
  { value: 'special' as const, icon: 'star' },
  { value: 'birthday' as const, icon: 'cake-variant' },
  { value: 'anniversary' as const, icon: 'calendar-star' },
  { value: 'party' as const, icon: 'party-popper' },
  { value: 'dinner' as const, icon: 'silverware-fork-knife' },
  { value: 'gathering' as const, icon: 'account-group' },
];

export default function TimelineScreen() {
  const { t } = useTranslation();
  const eventTypes = EVENT_TYPES.map((e) => ({
    ...e,
    label: t(`timeline.types.${e.value}`),
  }));
  const insets = useSafeAreaInsets();
  const { filterPersonId: initialFilterPersonId } = useLocalSearchParams<{ filterPersonId?: string }>();
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
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [eventType, setEventType] = useState('met');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [filterPersonId, setFilterPersonId] = useState<string | null>(initialFilterPersonId ?? null);
  const [filterEventType, setFilterEventType] = useState<string | null>(null);
  const [personMenuVisible, setPersonMenuVisible] = useState(false);
  const [eventMenuVisible, setEventMenuVisible] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Generate birthday events from people with birthday
  const birthdayEvents = useMemo(() => {
    return people
      .filter((p) => p.dateOfBirth)
      .map((p) => ({
        id: `birthday-${p.id}`,
        personId: p.id,
        eventType: 'birthday',
        eventDate: p.dateOfBirth!,
        notes: t('timeline.birthdayOf', { name: p.name }),
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
        const guestIds = parseJsonArray(event.guestIds);
        const guestNames = guestIds.map((gid) => {
          const person = people.find((p) => p.id === gid);
          return person?.name || t('timeline.unknown');
        });

        // Create ONE event for the entire party
        return {
          id: `party-${event.id}`,
          personId: null as any, // No specific person - it's a group event
          eventType: event.eventType || 'party',
          eventDate: event.eventDate,
          notes: [
            event.name || t('timeline.types.party'),
            guestIds.length > 0
              ? `${t('timeline.withNames', { names: guestNames.slice(0, 3).join(', ') })}${
                  guestNames.length > 3
                    ? ` ${t('timeline.andMore', { count: guestNames.length - 3 })}`
                    : ''
                }`
              : '',
            event.location ? t('timeline.atPlace', { place: event.location }) : '',
          ]
            .filter(Boolean)
            .join(' '),
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
    return person?.name || t('timeline.unknown');
  };

  const getEventLabel = (type: string) => {
    const eventConfig = eventTypes.find((e) => e.value === type);
    return eventConfig?.label || type;
  };

  const togglePersonId = (id: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleAddEvent = async () => {
    if (selectedPersonIds.length === 0) {
      Alert.alert(t('timeline.selectPersonTitle'), t('timeline.selectPersonMessage'));
      return;
    }

    const parsedDate = parseFlexibleDate(dateInput);
    if (!parsedDate) {
      Alert.alert(t('dates.invalidDate'), t('dates.invalidDateMessage'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEvent) {
        await updateEvent.mutateAsync({
          id: editingEvent.id,
          personId: selectedPersonIds[0],
          eventType: eventType as any,
          notes: notes.trim() || undefined,
          eventDate: parsedDate,
        });
        Alert.alert(t('common.success'), t('timeline.updated'));
      } else {
        await Promise.all(
          selectedPersonIds.map((personId) =>
            createEvent.mutateAsync({
              personId,
              eventType: eventType as any,
              notes: notes.trim() || undefined,
              eventDate: parsedDate,
            })
          )
        );
        Alert.alert(t('common.success'), t('timeline.added'));
      }

      closeDialog();
    } catch (err) {
      Alert.alert(
        t('common.error'),
        editingEvent ? t('timeline.updateFailed') : t('timeline.addFailed')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = () => {
    setAddDialogVisible(false);
    setEditingEvent(null);
    setSelectedPersonIds([]);
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
      setSelectedPersonIds(event.personId ? [event.personId] : []);
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

    confirmDestructive({
      title: eventType === 'party' ? t('timeline.deleteParty') : t('timeline.deleteEvent'),
      message:
        eventType === 'party' ? t('timeline.removePartyMessage') : t('timeline.removeEventMessage'),
      onConfirm: () => deleteFunction.mutateAsync(actualEventId),
    });
  };

  if (isLoading) {
    return (
      <CenteredContainer style={styles.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
        <Text style={{ ...fzText.sub, marginTop: 12 }}>{t('timeline.loading')}</Text>
      </CenteredContainer>
    );
  }

  if (error) {
    return (
      <CenteredContainer style={styles.centered}>
        <Text style={{ ...fzText.sub, marginBottom: 16 }}>{t('timeline.loadFailed')}</Text>
        <Button mode="contained" onPress={() => refetch()}>{t('timeline.retry')}</Button>
      </CenteredContainer>
    );
  }

  const hasActiveFilters = filterPersonId || filterEventType;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      {/* App bar */}
      <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.appBarRow}>
          <Text style={fzText.screenTitle}>{t('timeline.title')}</Text>
          <View style={styles.appBarActions}>
            <IconCircle icon="plus" onPress={() => setAddDialogVisible(true)} />
            <IconCircle
              icon={filtersVisible ? 'filterRemove' : 'filter'}
              fill={hasActiveFilters ? fz.ink : fz.surface}
              color={hasActiveFilters ? '#fff' : fz.ink}
              onPress={() => setFiltersVisible(!filtersVisible)}
            />
          </View>
        </View>
        <Text style={[fzText.meta, { paddingHorizontal: fz.s.edge, paddingBottom: fz.s.md }]}>
          {t('timeline.notesCount', { count: filteredEvents.length })}
        </Text>
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
        eventTypes={eventTypes}
        getPersonName={getPersonName}
      />

      {filteredEvents.length === 0 ? (
        <CenteredContainer style={styles.emptyState}>
          <Text style={fzText.title}>
            {filterPersonId || filterEventType ? t('timeline.noMatching') : t('timeline.noEvents')}
          </Text>
          <Text style={[fzText.sub, { marginTop: 8, marginBottom: 24, textAlign: 'center' }]}>
            {filterPersonId || filterEventType
              ? t('timeline.adjustFilters')
              : t('timeline.startTracking')}
          </Text>
          {!filterPersonId && !filterEventType && (
            <Button mode="contained" onPress={() => setAddDialogVisible(true)}>
              {t('timeline.addFirst')}
            </Button>
          )}
          {(filterPersonId || filterEventType) && (
            <Button
              mode="outlined"
              textColor={fz.ink}
              onPress={() => {
                setFilterPersonId(null);
                setFilterEventType(null);
              }}
            >
              {t('timeline.clearFilters')}
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
        selectedPersonIds={selectedPersonIds}
        togglePersonId={togglePersonId}
        people={people}
        eventType={eventType}
        setEventType={setEventType}
        eventTypes={eventTypes}
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
    backgroundColor: fz.paper,
  },
  centered: {
    padding: 20,
    backgroundColor: fz.paper,
  },
  appBar: {
    backgroundColor: fz.paper,
  },
  appBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: fz.s.edge,
    paddingBottom: 2,
  },
  appBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  list: {
    paddingHorizontal: fz.s.edge,
    paddingTop: 4,
    paddingBottom: 110,
  },
  emptyState: {
    padding: 24,
    backgroundColor: fz.paper,
  },
});
