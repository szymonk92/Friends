import React from 'react';
import { StyleSheet, View, ScrollView, Image } from 'react-native';
import { Card, Text, Searchbar, Chip, Divider, List } from 'react-native-paper';
import { getInitials } from '@/lib/utils/format';

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
  relationshipColors: Record<string, string>;
}

export default function GuestSelector({
  selectedGuests,
  onToggleGuest,
  people,
  searchQuery,
  setSearchQuery,
  relationshipColors,
}: GuestSelectorProps) {
  // Get selected guest objects for display
  const selectedGuestObjects = people.filter((p) => selectedGuests.includes(p.id));

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Select Guests ({selectedGuests.length})
        </Text>

        <Searchbar
          placeholder="Search people..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        {/* Selected guests chips */}
        {selectedGuests.length > 0 && (
          <View style={styles.selectedChips}>
            {selectedGuestObjects.map((guest) => (
              <Chip key={guest.id} onClose={() => onToggleGuest(guest.id)} style={styles.guestChip}>
                {guest.name}
              </Chip>
            ))}
          </View>
        )}

        <Divider style={styles.divider} />

        {/* People list */}
        <View style={styles.peopleList}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 300 }}>
            {people.slice(0, 10).map((person) => {
              const avatarColor = person.relationshipType
                ? relationshipColors[person.relationshipType] || '#6200ee'
                : '#6200ee';

              return (
                <List.Item
                  key={person.id}
                  title={person.name}
                  left={() => (
                    <View style={styles.avatarContainer}>
                      {person.photoPath ? (
                        <Image source={{ uri: person.photoPath }} style={styles.avatarImage} />
                      ) : (
                        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                          <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  right={() => (
                    <Chip
                      selected={selectedGuests.includes(person.id)}
                      onPress={() => onToggleGuest(person.id)}
                      style={styles.selectChip}
                    >
                      {selectedGuests.includes(person.id) ? 'Selected' : 'Add'}
                    </Chip>
                  )}
                  style={styles.personItem}
                />
              );
            })}
          </ScrollView>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  searchbar: {
    marginBottom: 12,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  guestChip: {
    backgroundColor: '#e3f2fd',
  },
  divider: {
    marginVertical: 8,
  },
  peopleList: {
    maxHeight: 300,
  },
  personItem: {
    paddingVertical: 4,
  },
  avatarContainer: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectChip: {
    marginRight: 8,
  },
});
