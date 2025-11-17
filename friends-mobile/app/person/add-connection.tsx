import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Card,
  List,
  Searchbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateConnection } from '@/hooks/useConnections';
import { usePerson, usePeople } from '@/hooks/usePeople';
import { getInitials } from '@/lib/utils/format';

const RELATIONSHIP_TYPES = [
  { label: 'Friend', value: 'friend', icon: 'account-heart' },
  { label: 'Family', value: 'family', icon: 'home-heart' },
  { label: 'Colleague', value: 'colleague', icon: 'briefcase' },
  { label: 'Partner', value: 'partner', icon: 'heart' },
  { label: 'Acquaintance', value: 'acquaintance', icon: 'account' },
];

const CONNECTION_STATUSES = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Ended', value: 'ended' },
  { label: 'Complicated', value: 'complicated' },
];

export default function AddConnectionScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person } = usePerson(personId!);
  const { data: allPeople = [], isLoading: loadingPeople } = usePeople();
  const createConnection = useCreateConnection();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [relationshipType, setRelationshipType] = useState<string>('friend');
  const [status, setStatus] = useState<string>('active');
  const [qualifier, setQualifier] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out the current person and filter by search
  const availablePeople = allPeople
    .filter((p) => p.id !== personId)
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.nickname && p.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const selectedPerson = allPeople.find((p) => p.id === selectedPersonId);

  const handleSubmit = async () => {
    if (!selectedPersonId) {
      Alert.alert('Select Person', 'Please select who this person is connected to.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createConnection.mutateAsync({
        person1Id: personId!,
        person2Id: selectedPersonId,
        relationshipType: relationshipType as any,
        status: status as any,
        qualifier: qualifier.trim() || undefined,
        notes: notes.trim() || undefined,
        strength: 0.5, // Default strength
      });

      Alert.alert(
        'Success!',
        `Connection between ${person?.name} and ${selectedPerson?.name} added!`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add connection. Please try again.');
      console.error('Add connection error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Add Connection for {person?.name}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Define how this person is related to someone else
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.label}>
              Select Person to Connect
            </Text>
            <Searchbar
              placeholder="Search people..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
            />

            {loadingPeople && (
              <View style={styles.centered}>
                <ActivityIndicator />
              </View>
            )}

            {selectedPerson && (
              <Card style={styles.selectedCard} mode="outlined">
                <Card.Content>
                  <View style={styles.selectedPerson}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(selectedPerson.name)}</Text>
                    </View>
                    <View style={styles.personInfo}>
                      <Text variant="titleMedium">{selectedPerson.name}</Text>
                      {selectedPerson.nickname && (
                        <Text variant="bodySmall" style={styles.nickname}>
                          "{selectedPerson.nickname}"
                        </Text>
                      )}
                    </View>
                    <Button mode="text" onPress={() => setSelectedPersonId(null)}>
                      Change
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            )}

            {!selectedPerson && availablePeople.length === 0 && !loadingPeople && (
              <Text style={styles.emptyText}>
                No other people found. Add more people first.
              </Text>
            )}

            {!selectedPerson && availablePeople.length > 0 && (
              <View style={styles.peopleList}>
                {availablePeople.slice(0, 10).map((p) => (
                  <List.Item
                    key={p.id}
                    title={p.name}
                    description={p.nickname || p.relationshipType}
                    left={(props) => (
                      <View style={[styles.listAvatar, props.style]}>
                        <Text style={styles.listAvatarText}>{getInitials(p.name)}</Text>
                      </View>
                    )}
                    onPress={() => setSelectedPersonId(p.id)}
                    style={styles.listItem}
                  />
                ))}
                {availablePeople.length > 10 && (
                  <Text style={styles.moreText}>
                    + {availablePeople.length - 10} more (use search to find)
                  </Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {selectedPerson && (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleSmall" style={styles.label}>
                  Relationship Type
                </Text>
                <View style={styles.typeGrid}>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      mode={relationshipType === type.value ? 'contained' : 'outlined'}
                      onPress={() => setRelationshipType(type.value)}
                      icon={type.icon}
                      style={styles.typeButton}
                      compact
                    >
                      {type.label}
                    </Button>
                  ))}
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleSmall" style={styles.label}>
                  Connection Status
                </Text>
                <SegmentedButtons
                  value={status}
                  onValueChange={setStatus}
                  buttons={CONNECTION_STATUSES}
                  style={styles.segmented}
                />

                <TextInput
                  mode="outlined"
                  label="Qualifier (optional)"
                  placeholder="e.g., childhood friend, work colleague, cousin"
                  value={qualifier}
                  onChangeText={setQualifier}
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Notes (optional)"
                  placeholder="Any additional notes about this connection..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                />
              </Card.Content>
            </Card>
          </>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || !selectedPersonId}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          Add Connection
        </Button>

        <Button mode="text" onPress={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>

        <View style={styles.spacer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  searchbar: {
    marginBottom: 12,
  },
  centered: {
    padding: 20,
    alignItems: 'center',
  },
  selectedCard: {
    backgroundColor: '#e8f5e9',
    marginTop: 8,
  },
  selectedPerson: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  personInfo: {
    flex: 1,
  },
  nickname: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    padding: 16,
  },
  peopleList: {
    maxHeight: 300,
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listItem: {
    backgroundColor: '#fff',
    marginBottom: 4,
    borderRadius: 8,
  },
  moreText: {
    textAlign: 'center',
    opacity: 0.6,
    padding: 8,
    fontStyle: 'italic',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeButton: {
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  spacer: {
    height: 40,
  },
});
