import type { DatePrecision } from '@/lib/utils/dates';
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import type { PersonWithPhoto } from '@/hooks/usePeople';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { useTranslation } from 'react-i18next';

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
  /** Partial birthdays / important dates: don't print a day we never had. */
  datePrecision?: DatePrecision | null;
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
  /** Opens the edit/delete sheet for this event. */
  onMenu: (event: TimelineEvent) => void;
  getPersonName: (id: string) => string;
  getEventLabel: (type: string) => string;
}

function formatTimelineDate(date: Date, precision?: DatePrecision | null): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: precision === 'month' ? undefined : 'numeric',
  })
    .format(date)
    .toUpperCase();
}

export default function TimelineEventItem({
  item,
  index,
  filteredEvents,
  people,
  onMenu,
  getPersonName,
  getEventLabel,
}: TimelineEventItemProps) {
  const { t } = useTranslation();
  const personName = item.isPartyEvent
    ? item.partyDetails?.name || t('timeline.types.party')
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
          {item.datePrecision !== 'year' && (
            <Text style={fzText.label}>
              {formatTimelineDate(new Date(item.eventDate!), item.datePrecision)}
            </Text>
          )}

          <View style={styles.titleRow}>
            <TouchableOpacity style={styles.personRow} onPress={navigate} activeOpacity={0.7}>
              {item.isPartyEvent ? (
                <View style={[styles.avatar, { backgroundColor: fz.ink }]}>
                  <Text style={styles.avatarEmoji}>🎉</Text>
                </View>
              ) : person ? (
                <Avatar name={person.name} photoPath={person.photoPath} size={34} />
              ) : null}
              <Text style={styles.title} numberOfLines={1}>{personName}</Text>
            </TouchableOpacity>

            {!isBirthday && !isImportantDate && (
              <IconButton
                icon="dots-vertical"
                size={18}
                onPress={() => onMenu(item)}
                style={styles.menuButton}
                iconColor={fz.textMute}
              />
            )}
          </View>

          <View style={styles.tagRow}>
            <Pill
              label={getEventLabel(item.eventType)}
              variant={isBirthday || isImportantDate ? 'soft' : 'surface'}
            />
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