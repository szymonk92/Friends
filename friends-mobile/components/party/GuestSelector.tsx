import { StyleSheet, View, ScrollView, TextInput } from 'react-native';
import { fz } from '@/lib/design/tokens';
import { FormSection } from '@/components/FormKit';
import { Pill } from '@/components/Pill';
import { PersonRow } from '@/components/PersonRow';

interface Person {
  id: string;
  name: string;
  photoPath?: string | null;
  relationshipType?: string | null;
}

interface GuestSelectorProps {
  selectedGuests: string[];
  onToggleGuest: (id: string) => void;
  people: Person[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function GuestSelector({
  selectedGuests,
  onToggleGuest,
  people,
  searchQuery,
  setSearchQuery,
}: GuestSelectorProps) {
  // Get selected guest objects for display
  const selectedGuestObjects = people.filter((p) => selectedGuests.includes(p.id));

  return (
    <FormSection title={`Select Guests (${selectedGuests.length})`}>
      <View style={styles.searchInput}>
        <TextInput
          placeholder="Search people..."
          placeholderTextColor={fz.textMute}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchText}
        />
      </View>

      {/* Selected guests chips */}
      {selectedGuests.length > 0 && (
        <View style={styles.selectedChips}>
          {selectedGuestObjects.map((guest) => (
            <Pill key={guest.id} label={guest.name} onClose={() => onToggleGuest(guest.id)} />
          ))}
        </View>
      )}

      <View style={styles.divider} />

      {/* People list */}
      <ScrollView nestedScrollEnabled style={styles.peopleList}>
        {people.slice(0, 10).map((person) => {
          const selected = selectedGuests.includes(person.id);
          return (
            <PersonRow
              key={person.id}
              name={person.name}
              photoPath={person.photoPath}
              avatarSize={36}
              divider
              onPress={() => onToggleGuest(person.id)}
              right={
                <Pill
                  label={selected ? 'Selected' : 'Add'}
                  selected={selected}
                  onPress={() => onToggleGuest(person.id)}
                />
              }
            />
          );
        })}
      </ScrollView>
    </FormSection>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    height: 44,
    borderRadius: fz.rPill,
    backgroundColor: fz.surface,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchText: {
    fontFamily: fz.font,
    fontSize: 15,
    color: fz.ink,
    padding: 0,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: fz.s.md,
  },
  divider: {
    height: 1,
    backgroundColor: fz.hairline,
    marginTop: fz.s.md,
    marginBottom: fz.s.xs,
  },
  peopleList: {
    maxHeight: 300,
  },
});
