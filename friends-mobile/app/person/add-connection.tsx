import { StyleSheet, View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Card,
  List,
  Searchbar,
  ActivityIndicator,
  Checkbox,
  Chip,
} from 'react-native-paper';
import { useState, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateConnection, usePersonConnections } from '@/hooks/useConnections';
import { usePerson, usePeople, useMePerson } from '@/hooks/usePeople';
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
  const { data: regularPeople = [], isLoading: loadingPeople } = usePeople();
  const { data: mePerson } = useMePerson();
  const { data: existingConnections = [] } = usePersonConnections(personId!);
  const createConnection = useCreateConnection();

  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [singlePersonMode, setSinglePersonMode] = useState(false);
  const [singlePersonId, setSinglePersonId] = useState<string | null>(null);
  const [relationshipType, setRelationshipType] = useState<string>('friend');
  const [status, setStatus] = useState<string>('active');
  const [qualifier, setQualifier] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine regular people with ME
  const allPeople = useMemo(() => {
    const combined = [...regularPeople];
    if (mePerson) {
      combined.push(mePerson);
    }
    return combined;
  }, [regularPeople, mePerson]);

  // Filter out the current person and filter by search with ranking
  const availablePeople = allPeople
    .filter((p) => p.id !== personId)
    .filter((p) => {
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      const name = p.name.toLowerCase();
      const nickname = p.nickname?.toLowerCase() || '';

      if (name === query || nickname === query) return true; // Exact match
      if (name.startsWith(query) || nickname.startsWith(query)) return true; // Starts with
      if (name.includes(query) || nickname.includes(query)) return true; // Contains

      return false;
    })
    .sort((a, b) => {
      if (!searchQuery) return 0;

      const query = searchQuery.toLowerCase();

      const getScore = (p: typeof a) => {
        const name = p.name.toLowerCase();
        const nickname = p.nickname?.toLowerCase() || '';

        if (name === query || nickname === query) return 3; // Exact match
        if (name.startsWith(query) || nickname.startsWith(query)) return 2; // Starts with
        if (name.includes(query) || nickname.includes(query)) return 1; // Contains
        return 0;
      };

      const aScore = getScore(a);
      const bScore = getScore(b);

      if (aScore !== bScore) {
        return bScore - aScore; // Higher score first
      }

      // If scores are equal, sort by name
      return a.name.localeCompare(b.name);
    });

  const togglePersonSelection = (personId: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const selectSinglePerson = (personId: string) => {
    setSinglePersonId(personId);
    setSinglePersonMode(true);
    setSelectedPersonIds([]);
  };

  const backToMultiMode = () => {
    setSinglePersonMode(false);
    setSinglePersonId(null);
    setRelationshipType('friend');
    setStatus('active');
    setQualifier('');
    setNotes('');
  };

  const selectedSinglePerson = allPeople.find((p) => p.id === singlePersonId);

  const handleSubmit = async () => {
    // Single person mode
    if (singlePersonMode && singlePersonId) {
      // Check if connection already exists with same relationship type
      const duplicateConnection = existingConnections.find(
        (conn) =>
          ((conn.person1Id === personId && conn.person2Id === singlePersonId) ||
            (conn.person2Id === personId && conn.person1Id === singlePersonId)) &&
          conn.relationshipType === relationshipType
      );

      if (duplicateConnection) {
        Alert.alert(
          'Duplicate Connection',
          `A ${relationshipType} connection already exists between ${person?.name} and ${selectedSinglePerson?.name}. You can add a different relationship type or edit the existing one.`,
          [{ text: 'OK' }]
        );
        return;
      }

      setIsSubmitting(true);

      try {
        await createConnection.mutateAsync({
          person1Id: personId!,
          person2Id: singlePersonId,
          relationshipType: relationshipType as any,
          status: status as any,
          qualifier: qualifier.trim() || undefined,
          notes: notes.trim() || undefined,
          strength: 0.5,
        });

        Alert.alert(
          'Success!',
          `Connection added: ${person?.name} ↔️ ${selectedSinglePerson?.name} (${relationshipType})`,
          [
            {
              text: 'Add Another',
              onPress: () => {
                backToMultiMode();
              },
            },
            {
              text: 'Add Different Type',
              onPress: () => {
                setRelationshipType('friend');
                setStatus('active');
                setQualifier('');
                setNotes('');
              },
            },
            {
              text: 'Done',
              onPress: () => router.back(),
            },
          ]
        );
      } catch (error) {
        console.error('[AddConnection] Error creating connection:', error);
        Alert.alert('Error', 'Failed to create connection. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Multi-select mode
    if (selectedPersonIds.length === 0) {
      Alert.alert('Select People', 'Please select at least one person to connect to.');
      return;
    }

    // Check for duplicates
    const duplicates: string[] = [];
    for (const selectedPersonId of selectedPersonIds) {
      const dupConn = existingConnections.find(
        (conn) =>
          ((conn.person1Id === personId && conn.person2Id === selectedPersonId) ||
            (conn.person2Id === personId && conn.person1Id === selectedPersonId)) &&
          conn.relationshipType === relationshipType
      );
      if (dupConn) {
        const selectedPerson = allPeople.find((p) => p.id === selectedPersonId);
        duplicates.push(selectedPerson?.name || 'Unknown');
      }
    }

    if (duplicates.length > 0) {
      Alert.alert(
        'Duplicate Connections',
        `${relationshipType} connection already exists with: ${duplicates.join(', ')}. They will be skipped.`,
        [{ text: 'OK' }]
      );
    }

    setIsSubmitting(true);

    try {
      // Create connections for all selected people (skip duplicates)
      const promises = selectedPersonIds
        .filter((selectedPersonId) => {
          const isDuplicate = existingConnections.find(
            (conn) =>
              ((conn.person1Id === personId && conn.person2Id === selectedPersonId) ||
                (conn.person2Id === personId && conn.person1Id === selectedPersonId)) &&
              conn.relationshipType === relationshipType
          );
          return !isDuplicate;
        })
        .map((selectedPersonId) =>
          createConnection.mutateAsync({
            person1Id: personId!,
            person2Id: selectedPersonId,
            relationshipType: relationshipType as any,
            status: status as any,
            qualifier: qualifier.trim() || undefined,
            notes: notes.trim() || undefined,
            strength: 0.5,
          })
        );

      await Promise.all(promises);

      const selectedNames = selectedPersonIds
        .map((id) => allPeople.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      Alert.alert(
        'Success!',
        `Added ${promises.length} connection(s): ${person?.name} ↔️ ${selectedNames} (${relationshipType})`,
        [
          {
            text: 'Add More',
            onPress: () => {
              // Reset form to add more connections
              setSelectedPersonIds([]);
              setRelationshipType('friend');
              setStatus('active');
              setQualifier('');
              setNotes('');
              setSearchQuery('');
            },
          },
          {
            text: 'Done',
            onPress: () => router.back(),
            style: 'cancel',
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
              {singlePersonMode
                ? 'Define detailed connection'
                : 'Select multiple people (checkbox) or tap avatar for detailed single connection'}
            </Text>
          </Card.Content>
        </Card>

        {singlePersonMode && selectedSinglePerson ? (
          // Single person detailed mode
          <>
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.singlePersonHeader}>
                  <Button mode="text" icon="arrow-left" onPress={backToMultiMode}>
                    Back to Multi-Select
                  </Button>
                </View>
                <Card style={styles.selectedCard} mode="outlined">
                  <Card.Content>
                    <View style={styles.selectedPerson}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(selectedSinglePerson.name)}</Text>
                      </View>
                      <View style={styles.personInfo}>
                        <Text variant="titleMedium">{selectedSinglePerson.name}</Text>
                        {selectedSinglePerson.nickname && (
                          <Text variant="bodySmall" style={styles.nickname}>
                            "{selectedSinglePerson.nickname}"
                          </Text>
                        )}
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </Card.Content>
            </Card>

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
                  Status
                </Text>
                <SegmentedButtons
                  value={status}
                  onValueChange={setStatus}
                  buttons={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'complicated', label: 'Complicated' },
                  ]}
                  style={styles.segmented}
                />
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleSmall" style={styles.label}>
                  Additional Details
                </Text>
                <TextInput
                  label="Qualifier (e.g., best, close, ex)"
                  value={qualifier}
                  onChangeText={setQualifier}
                  mode="outlined"
                  style={styles.input}
                  placeholder="How to qualify this relationship"
                />
                <TextInput
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  placeholder="Any additional context"
                />
              </Card.Content>
            </Card>
          </>
        ) : (
          // Multi-select mode
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.label}>
                Select People to Connect ({selectedPersonIds.length} selected)
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

            {selectedPersonIds.length > 0 && (
              <View style={styles.selectedChipsContainer}>
                {selectedPersonIds.map((id) => {
                  const person = allPeople.find((p) => p.id === id);
                  return person ? (
                    <Chip
                      key={id}
                      onClose={() => togglePersonSelection(id)}
                      style={styles.selectedChip}
                    >
                      {person.name}
                    </Chip>
                  ) : null;
                })}
              </View>
            )}

            {availablePeople.length === 0 && !loadingPeople && (
              <Text style={styles.emptyText}>
                No other people found. Add more people first.
              </Text>
            )}

            {availablePeople.length > 0 && (
              <ScrollView style={styles.peopleList} nestedScrollEnabled>
                {availablePeople.map((p) => (
                  <List.Item
                    key={p.id}
                    title={p.name}
                    description={p.nickname || p.relationshipType}
                    left={(props) => (
                      <TouchableOpacity onPress={() => selectSinglePerson(p.id)}>
                        <View style={[styles.listAvatar, props.style]}>
                          <Text style={styles.listAvatarText}>{getInitials(p.name)}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    right={(props) => (
                      <Checkbox
                        status={selectedPersonIds.includes(p.id) ? 'checked' : 'unchecked'}
                        {...props}
                      />
                    )}
                    onPress={() => togglePersonSelection(p.id)}
                    style={styles.listItem}
                  />
                ))}
              </ScrollView>
            )}
            </Card.Content>
          </Card>
        )}

        {!singlePersonMode && selectedPersonIds.length > 0 && (
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
                  label="Qualifier (married, sibling, etc.)"
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
          disabled={
            isSubmitting ||
            (singlePersonMode ? !singlePersonId : selectedPersonIds.length === 0)
          }
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          {singlePersonMode ? 'Add Connection' : `Add ${selectedPersonIds.length} Connection(s)`}
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
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  selectedChip: {
    marginBottom: 4,
  },
  singlePersonHeader: {
    marginBottom: 12,
  },
});
