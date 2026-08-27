import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Text, IconButton, Menu } from 'react-native-paper';
import { router } from 'expo-router';
import { getInitials } from '@/lib/utils/format';
import type { PersonWithPhoto } from '@/hooks/usePeople';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';

/** Shape of all timeline items after merging contact events, birthdays, party events etc. */
export interface TimelineEvent {
  id: string;
  personId: string | null;
  eventType: string;
  eventDate: Date | string | null;
  notes?: string | null;
  location?: string | null;
  duration?: number | null;
  isBirthday?: boolean;
  isImportantDate?: boolean;
  isPartyEvent?: boolean;
  partyDetails?: {
    id: string;
    name?: string | null;
    eventType?: string | null;
    eventDate?: Date | string | null;
    location?: string | null;
    guestIds?: string | null;
  };
  guestCount?: number;
  guestNames?: string[];
}

interface TimelineEventItemProps {
  item: TimelineEvent;
  index: number;
  filteredEvents: TimelineEvent[];
  people: PersonWithPhoto[];
  eventMenuVisible: string | null;
  setEventMenuVisible: (id: string | null) => void;
  handleEditEvent: (event: TimelineEvent) => void;
  handleDeleteEvent: (id: string) => void;
  getPersonName: (id: string) => string;
  getEventLabel: (type: string) => string;
}

function formatTimelineDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
    .format(date)
    .toUpperCase();
}

export default function TimelineEventItem({
  item,
  index,
  filteredEvents,
  people,
  eventMenuVisible,
  setEventMenuVisible,
  handleEditEvent,
  handleDeleteEvent,
  getPersonName,
  getEventLabel,
}: TimelineEventItemProps) {
  const personName = item.isPartyEvent
    ? item.partyDetails?.name || 'Party'
    : getPersonName(item.personId ?? '');
  const person = people.find((p) => p.id === item.personId);
  const isBirthday = item.isBirthday || item.eventType === 'birthday';
  const isImportantDate = item.isImportantDate || item.eventType === 'anniversary';

  const currentYear = new Date(item.eventDate!).getFullYear();
  const previousYear =
    index > 0 ? new Date(filteredEvents[index - 1].eventDate!).getFullYear() : null;
  const nextYear =
    index < filteredEvents.length - 1
      ? new Date(filteredEvents[index + 1].eventDate!).getFullYear()
      : null;
  const showYearHeader = index === 0 || currentYear !== previousYear;
  const isLast = index >= filteredEvents.length - 1;
  const isLatest = index === 0; // list is sorted desc — index 0 is most recent

  const navigate = () => {
    if (item.isPartyEvent && item.partyDetails) {
      const actualEventId = item.id.replace('party-', '');
      router.push(`/party-planner?eventId=${actualEventId}`);
    } else if (!item.isPartyEvent && person) {
      router.push(`/person/${person.id}`);
    }
  };

  return (
    <>
      {showYearHeader && (
        <View style={styles.yearHeader}>
          <View style={styles.yearRule} />
          <Text style={fzText.label}>{currentYear}</Text>
          <View style={styles.yearRule} />
        </View>
      )}

      <View style={styles.row}>
        {/* Rail */}
        <View style={styles.rail}>
          <View style={[styles.dot, isLatest ? styles.dotFilled : styles.dotOutline]} />
          {!isLast && <View style={styles.connector} />}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={fzText.label}>{formatTimelineDate(new Date(item.eventDate!))}</Text>

          <View style={styles.titleRow}>
            <TouchableOpacity style={styles.personRow} onPress={navigate} activeOpacity={0.7}>
              {item.isPartyEvent ? (
                <View style={[styles.avatar, { backgroundColor: fz.ink }]}>
                  <Text style={styles.avatarEmoji}>🎉</Text>
                </View>
              ) : person ? (
                person.photoPath ? (
                  <Image source={{ uri: person.photoPath }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: fz.surface }]}>
                    <Text style={[styles.avatarText, { color: fz.ink }]}>{getInitials(person.name)}</Text>
                  </View>
                )
              ) : null}
              <Text style={styles.title} numberOfLines={1}>{personName}</Text>
            </TouchableOpacity>

            {!isBirthday && !isImportantDate && (
              <Menu
                visible={eventMenuVisible === item.id}
                onDismiss={() => setEventMenuVisible(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={18}
                    onPress={() => setEventMenuVisible(item.id)}
                    style={styles.menuButton}
                    iconColor={fz.textMute}
                  />
                }
              >
                <Menu.Item
                  onPress={() => { setEventMenuVisible(null); handleEditEvent(item); }}
                  title="Edit"
                  leadingIcon="pencil-outline"
                />
                <Menu.Item
                  onPress={() => { setEventMenuVisible(null); handleDeleteEvent(item.id); }}
                  title="Delete"
                  leadingIcon="delete-outline"
                />
              </Menu>
            )}
          </View>

          <View style={styles.tagRow}>
            <Pill label={getEventLabel(item.eventType)} variant="surface" />
            {isBirthday && <Pill label="Birthday" variant="soft" />}
            {isImportantDate && <Pill label="Anniversary" variant="soft" />}
          </View>

          {item.notes && <Text style={fzText.body}>{item.notes}</Text>}

          {item.isPartyEvent && item.partyDetails && (
            <Text style={styles.guestCount}>
              👥 {item.guestCount} {item.guestCount === 1 ? 'guest' : 'guests'}
            </Text>
          )}

          {(item.location || item.duration) && (
            <View style={styles.metaRow}>
              {item.location && <Text style={styles.metaText}>📍 {item.location}</Text>}
              {item.duration && <Text style={styles.metaText}>⏱️ {item.duration} min</Text>}
            </View>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  yearRule: {
    flex: 1,
    height: 1,
    backgroundColor: fz.hairline,
  },
  row: {
    flexDirection: 'row',
  },
  rail: {
    width: 28,
    alignItems: 'center',
    paddingTop: 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotFilled: {
    backgroundColor: fz.ink,
  },
  dotOutline: {
    backgroundColor: fz.paper,
    borderWidth: 2,
    borderColor: fz.outline,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: fz.hairline,
    marginTop: 4,
    minHeight: 20,
  },
  content: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fz.font,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  title: {
    ...fzText.name,
    fontSize: 15.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  guestCount: {
    ...fzText.sub,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  metaText: {
    ...fzText.time,
  },
  menuButton: {
    margin: 0,
  },
});