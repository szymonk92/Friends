import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { PersonWithPhoto } from '@/hooks/usePeople';
import { useTranslation } from 'react-i18next';
import { fz } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { PersonPickerModal } from '@/components/PersonPickerModal';

interface EventTypeOption {
  value: string;
  label: string;
  icon: string;
}

interface TimelineFiltersProps {
  filtersVisible: boolean;
  filterPersonId: string | null;
  setFilterPersonId: (id: string | null) => void;
  filterEventType: string | null;
  setFilterEventType: (type: string | null) => void;
  personMenuVisible: boolean;
  setPersonMenuVisible: (visible: boolean) => void;
  people: PersonWithPhoto[];
  eventTypes: EventTypeOption[];
  getPersonName: (id: string) => string;
}

// Same chip row as the Search categories: paper background, fz Pills, edge padding.
export default function TimelineFilters({
  filtersVisible,
  filterPersonId,
  setFilterPersonId,
  filterEventType,
  setFilterEventType,
  personMenuVisible,
  setPersonMenuVisible,
  people,
  eventTypes,
  getPersonName,
}: TimelineFiltersProps) {
  const { t } = useTranslation();

  // Sort event types to move selected to the front
  const sortedEventTypes = useMemo(() => {
    if (!filterEventType) return eventTypes;

    const selected = eventTypes.find((et) => et.value === filterEventType);
    const others = eventTypes.filter((et) => et.value !== filterEventType);

    return selected ? [selected, ...others] : eventTypes;
  }, [eventTypes, filterEventType]);

  if (!filtersVisible) return null;

  return (
    <View style={styles.section}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.row}
        contentContainerStyle={styles.rowContent}
      >
        <Pill
          icon="users"
          label={filterPersonId ? getPersonName(filterPersonId) : t('timeline.allPeople')}
          selected={!!filterPersonId}
          onPress={() => setPersonMenuVisible(true)}
          onClose={filterPersonId ? () => setFilterPersonId(null) : undefined}
        />

        <Pill
          label={t('timeline.allTypes')}
          selected={!filterEventType}
          onPress={() => setFilterEventType(null)}
        />
        {sortedEventTypes.map((type) => {
          const isSelected = filterEventType === type.value;
          return (
            <Pill
              key={type.value}
              label={type.label}
              selected={isSelected}
              onPress={() => setFilterEventType(isSelected ? null : type.value)}
            />
          );
        })}
      </ScrollView>

      <PersonPickerModal
        visible={personMenuVisible}
        onClose={() => setPersonMenuVisible(false)}
        title={t('timeline.pickPerson')}
        people={people}
        selectedIds={filterPersonId ? [filterPersonId] : []}
        onToggle={(id) => setFilterPersonId(id === filterPersonId ? null : id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: fz.paper },
  row: { paddingHorizontal: fz.s.edge, flexGrow: 0 },
  rowContent: { gap: 8, paddingRight: fz.s.edge, paddingBottom: fz.s.md },
});
