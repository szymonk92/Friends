import { StyleSheet, View, ScrollView, Image, Text, TextInput, TouchableOpacity } from 'react-native';
import { getInitials } from '@/lib/utils/format';
import { fz, fzText } from '@/lib/design/tokens';
import { FormSection } from '@/components/FormKit';
import { Pill } from '@/components/Pill';

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
            <View key={person.id} style={styles.personRow}>
              {person.photoPath ? (
                <Image source={{ uri: person.photoPath }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
                </View>
              )}
              <Text style={[fzText.name, styles.personName]} numberOfLines={1}>
                {person.name}
              </Text>
              <Pill
                label={selected ? 'Selected' : 'Add'}
                selected={selected}
                onPress={() => onToggleGuest(person.id)}
              />
            </View>
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
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: fz.s.md,
    paddingVertical: fz.s.sm,
    borderBottomWidth: 1,
    borderBottomColor: fz.hairline,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: fz.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    fontFamily: fz.font,
    fontWeight: '600',
    fontSize: 12,
    color: fz.ink,
  },
  personName: {
    flex: 1,
  },
});
