import { StyleSheet, View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Button,
  Divider,
  List,
  IconButton,
  FAB,
  Portal,
  Dialog,
  TextInput as PaperInput,
} from 'react-native-paper';
import { useState } from 'react';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { usePerson, useDeletePerson, usePeople } from '@/hooks/usePeople';
import { usePersonRelations, useDeleteRelation, useCreateRelation } from '@/hooks/useRelations';
import { usePersonConnections, useDeleteConnection } from '@/hooks/useConnections';
import { useCreateContactEvent } from '@/hooks/useContactEvents';
import {
  getInitials,
  formatRelativeTime,
  formatRelationType,
  getRelationEmoji,
  formatShortDate,
} from '@/lib/utils/format';

export default function PersonProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: person, isLoading: personLoading } = usePerson(id!);
  const { data: personRelations, isLoading: relationsLoading } = usePersonRelations(id!);
  const { data: personConnections, isLoading: connectionsLoading } = usePersonConnections(id!);
  const { data: allPeople = [] } = usePeople();
  const deletePerson = useDeletePerson();
  const deleteRelation = useDeleteRelation();
  const deleteConnection = useDeleteConnection();
  const createContactEvent = useCreateContactEvent();
  const createRelation = useCreateRelation();

  const [addDateDialogVisible, setAddDateDialogVisible] = useState(false);
  const [dateName, setDateName] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [isAddingDate, setIsAddingDate] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Person',
      `Are you sure you want to delete ${person?.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePerson.mutateAsync(id!);
            router.back();
          },
        },
      ]
    );
  };

  const handleDeleteRelation = (relationId: string, objectLabel: string) => {
    Alert.alert('Delete Relation', `Are you sure you want to delete "${objectLabel}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRelation.mutateAsync(relationId);
        },
      },
    ]);
  };

  const handleDeleteConnection = (connectionId: string, personName: string) => {
    Alert.alert(
      'Delete Connection',
      `Are you sure you want to remove the connection with ${personName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteConnection.mutateAsync(connectionId);
          },
        },
      ]
    );
  };

  const getConnectedPerson = (connection: any) => {
    const connectedId =
      connection.person1Id === id ? connection.person2Id : connection.person1Id;
    return allPeople.find((p) => p.id === connectedId);
  };

  const handleAvatarPress = () => {
    Alert.alert('Add Photo', 'Photo upload will be available in a future update.', [
      { text: 'OK' },
    ]);
  };

  const handleQuickAction = async (eventType: string, label: string) => {
    try {
      await createContactEvent.mutateAsync({
        personId: id!,
        eventType: eventType as any,
        eventDate: new Date(),
        notes: `Quick logged: ${label}`,
      });
      Alert.alert('Logged!', `${label} with ${person?.name} recorded.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to log event');
    }
  };

  const parseFlexibleDate = (input: string): Date | null => {
    const trimmed = input.trim();
    const parts = trimmed.split('-').map((p) => parseInt(p, 10));

    if (parts.length === 1 && parts[0] >= 1900 && parts[0] <= 2100) {
      return new Date(parts[0], 0, 1);
    } else if (parts.length === 2 && parts[0] >= 1900 && parts[1] >= 1 && parts[1] <= 12) {
      return new Date(parts[0], parts[1] - 1, 1);
    } else if (parts.length === 3 && parts[0] >= 1900 && parts[1] >= 1 && parts[2] >= 1) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  };

  const handleAddImportantDate = async () => {
    if (!dateName.trim()) {
      Alert.alert('Error', 'Please enter a name for this date');
      return;
    }
    const parsedDate = parseFlexibleDate(dateValue);
    if (!parsedDate) {
      Alert.alert('Invalid Date', 'Enter date as YYYY, YYYY-MM, or YYYY-MM-DD');
      return;
    }

    setIsAddingDate(true);
    try {
      await createRelation.mutateAsync({
        subjectId: id!,
        relationType: 'HAS_IMPORTANT_DATE',
        objectLabel: dateName.trim(),
        validFrom: parsedDate,
        category: 'important_date',
        source: 'manual',
        intensity: 'strong',
        confidence: 1.0,
      });
      setAddDateDialogVisible(false);
      setDateName('');
      setDateValue('');
      Alert.alert('Success', `${dateName} added to important dates!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add important date');
    } finally {
      setIsAddingDate(false);
    }
  };

  // Get important dates from relations
  const importantDates = personRelations?.filter((r) => r.relationType === 'HAS_IMPORTANT_DATE') || [];

  if (personLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centered}>
        <Text variant="headlineSmall">Person not found</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  // Group relations by type
  const relationsByType = personRelations?.reduce(
    (acc, relation) => {
      const type = relation.relationType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(relation);
      return acc;
    },
    {} as Record<string, typeof personRelations>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: person.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                icon="pencil"
                onPress={() => router.push(`/person/edit?personId=${id}`)}
                iconColor="#6200ee"
              />
              <IconButton icon="delete" onPress={handleDelete} iconColor="#d32f2f" />
            </View>
          ),
        }}
      />
      <View style={styles.wrapper}>
        <ScrollView style={styles.container}>
          {/* Profile Header */}
          <Card style={styles.headerCard}>
            <Card.Content>
              <View style={styles.header}>
                <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
                  </View>
                  <View style={styles.avatarBadge}>
                    <IconButton
                      icon="camera"
                      size={16}
                      iconColor="#fff"
                      style={styles.cameraIcon}
                    />
                  </View>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                  <Text variant="headlineSmall" style={styles.name}>
                    {person.name}
                  </Text>
                  {person.nickname && (
                    <Text variant="bodyLarge" style={styles.nickname}>
                      "{person.nickname}"
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.chips}>
                {person.relationshipType && (
                  <Chip icon="heart" style={styles.chip}>
                    {person.relationshipType}
                  </Chip>
                )}
                {person.personType && (
                  <Chip icon="account" style={styles.chip}>
                    {person.personType}
                  </Chip>
                )}
                {person.importanceToUser && person.importanceToUser !== 'unknown' && (
                  <Chip icon="star" style={styles.chip}>
                    {person.importanceToUser.replace('_', ' ')}
                  </Chip>
                )}
              </View>

              {person.metDate && (
                <Text variant="bodySmall" style={styles.metDate}>
                  Met on {formatShortDate(new Date(person.metDate))}
                </Text>
              )}

              {person.notes && (
                <Text variant="bodyMedium" style={styles.notes}>
                  {person.notes}
                </Text>
              )}

              <Text variant="bodySmall" style={styles.meta}>
                Last updated {formatRelativeTime(new Date(person.updatedAt))}
              </Text>
            </Card.Content>
          </Card>

          {/* Quick Actions */}
          <Card style={styles.quickActionsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.quickActionsTitle}>
                Quick Actions
              </Text>
              <Text variant="bodySmall" style={styles.quickActionsSubtitle}>
                One-tap logging for today
              </Text>
              <View style={styles.quickActionsRow}>
                <Chip
                  icon="account-check"
                  onPress={() => handleQuickAction('met', 'Met')}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Met
                </Chip>
                <Chip
                  icon="phone"
                  onPress={() => handleQuickAction('called', 'Called')}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Called
                </Chip>
                <Chip
                  icon="message"
                  onPress={() => handleQuickAction('messaged', 'Messaged')}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Messaged
                </Chip>
              </View>
              <View style={styles.quickActionsRow}>
                <Chip
                  icon="coffee"
                  onPress={() => handleQuickAction('hung_out', 'Hung out')}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Hung Out
                </Chip>
                <Chip
                  icon="star"
                  onPress={() => handleQuickAction('special', 'Special event')}
                  style={styles.quickActionChip}
                  mode="outlined"
                >
                  Special
                </Chip>
              </View>
            </Card.Content>
          </Card>

          {/* Important Dates */}
          <Card style={styles.importantDatesCard}>
            <Card.Content>
              <View style={styles.importantDatesHeader}>
                <Text variant="titleMedium" style={styles.importantDatesTitle}>
                  Important Dates
                </Text>
                <Button
                  mode="outlined"
                  compact
                  icon="plus"
                  onPress={() => setAddDateDialogVisible(true)}
                >
                  Add
                </Button>
              </View>

              {person.dateOfBirth && (
                <View style={styles.importantDateItem}>
                  <Chip icon="cake-variant" compact style={styles.dateChip}>
                    Birthday
                  </Chip>
                  <Text variant="bodyMedium">
                    {formatShortDate(new Date(person.dateOfBirth))}
                  </Text>
                </View>
              )}

              {importantDates.map((date) => (
                <View key={date.id} style={styles.importantDateItem}>
                  <Chip icon="calendar-star" compact style={styles.dateChip}>
                    {date.objectLabel}
                  </Chip>
                  <Text variant="bodyMedium">
                    {date.validFrom ? formatShortDate(new Date(date.validFrom)) : 'No date'}
                  </Text>
                  <IconButton
                    icon="delete-outline"
                    size={18}
                    onPress={() => deleteRelation.mutateAsync(date.id)}
                  />
                </View>
              ))}

              {!person.dateOfBirth && importantDates.length === 0 && (
                <Text variant="bodySmall" style={styles.noDateText}>
                  No important dates added yet
                </Text>
              )}
            </Card.Content>
          </Card>

          {/* Relations */}
          <Card style={styles.relationsCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Relations ({personRelations?.length || 0})
              </Text>
              <Divider style={styles.divider} />

              {relationsLoading && (
                <View style={styles.centered}>
                  <ActivityIndicator />
                </View>
              )}

              {!relationsLoading && personRelations && personRelations.length === 0 && (
                <View style={styles.emptyRelations}>
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    No relations yet. Add a story to extract information about {person.name}.
                  </Text>
                  <Button mode="outlined" onPress={() => router.push('/(tabs)/two')}>
                    Add a Story
                  </Button>
                </View>
              )}

              {relationsByType &&
                Object.entries(relationsByType).map(([type, rels]) => (
                  <View key={type}>
                    <List.Subheader>
                      {getRelationEmoji(type)} {formatRelationType(type)} ({rels.length})
                    </List.Subheader>
                    {rels.map((relation) => (
                      <List.Item
                        key={relation.id}
                        title={relation.objectLabel}
                        description={
                          relation.category ||
                          relation.intensity ||
                          formatRelativeTime(new Date(relation.createdAt))
                        }
                        left={(props) => (
                          <List.Icon
                            {...props}
                            icon={
                              relation.status === 'past'
                                ? 'history'
                                : relation.status === 'future'
                                  ? 'clock-outline'
                                  : 'check-circle-outline'
                            }
                          />
                        )}
                        right={(props) => (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {relation.intensity && (
                              <Chip {...props} compact style={{ marginRight: 4 }}>
                                {relation.intensity}
                              </Chip>
                            )}
                            <IconButton
                              icon="pencil-outline"
                              size={20}
                              onPress={() =>
                                router.push(`/person/edit-relation?relationId=${relation.id}`)
                              }
                            />
                            <IconButton
                              icon="delete-outline"
                              size={20}
                              onPress={() =>
                                handleDeleteRelation(relation.id, relation.objectLabel)
                              }
                            />
                          </View>
                        )}
                        style={styles.relationItem}
                      />
                    ))}
                  </View>
                ))}
            </Card.Content>
          </Card>

          {/* Connections (Person-to-Person) */}
          <Card style={styles.relationsCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Connections ({personConnections?.length || 0})
              </Text>
              <Divider style={styles.divider} />

              {connectionsLoading && (
                <View style={styles.centered}>
                  <ActivityIndicator />
                </View>
              )}

              {!connectionsLoading && personConnections && personConnections.length === 0 && (
                <View style={styles.emptyRelations}>
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    No connections yet. Add connections to show how {person.name} relates to other
                    people.
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => router.push(`/person/add-connection?personId=${id}`)}
                  >
                    Add Connection
                  </Button>
                </View>
              )}

              {personConnections &&
                personConnections.map((connection) => {
                  const connectedPerson = getConnectedPerson(connection);
                  if (!connectedPerson) return null;

                  return (
                    <List.Item
                      key={connection.id}
                      title={connectedPerson.name}
                      description={`${connection.relationshipType}${connection.qualifier ? ` • ${connection.qualifier}` : ''}${connection.status !== 'active' ? ` • ${connection.status}` : ''}`}
                      left={() => (
                        <View style={styles.connectionAvatar}>
                          <Text style={styles.connectionAvatarText}>
                            {getInitials(connectedPerson.name)}
                          </Text>
                        </View>
                      )}
                      right={() => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Chip compact style={{ marginRight: 4 }}>
                            {connection.status}
                          </Chip>
                          <IconButton
                            icon="open-in-new"
                            size={20}
                            onPress={() => router.push(`/person/${connectedPerson.id}`)}
                          />
                          <IconButton
                            icon="delete-outline"
                            size={20}
                            onPress={() =>
                              handleDeleteConnection(connection.id, connectedPerson.name)
                            }
                          />
                        </View>
                      )}
                      onPress={() => router.push(`/person/${connectedPerson.id}`)}
                      style={styles.relationItem}
                    />
                  );
                })}
            </Card.Content>
          </Card>

          <View style={styles.spacer} />
        </ScrollView>

        <FAB
          icon="plus"
          label="Add Relation"
          style={styles.fab}
          onPress={() => router.push(`/person/add-relation?personId=${id}`)}
        />
      </View>

      {/* Add Important Date Dialog */}
      <Portal>
        <Dialog visible={addDateDialogVisible} onDismiss={() => setAddDateDialogVisible(false)}>
          <Dialog.Title>Add Important Date</Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
              label="Date Name"
              placeholder="e.g., Wedding Anniversary, First Met"
              value={dateName}
              onChangeText={setDateName}
              style={{ marginBottom: 16 }}
            />
            <PaperInput
              mode="outlined"
              label="Date"
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              value={dateValue}
              onChangeText={setDateValue}
            />
            <Text variant="labelSmall" style={{ opacity: 0.6, marginTop: 4 }}>
              Enter year only (2020), year-month (2020-06), or full date (2020-06-15)
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDateDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddImportantDate} loading={isAddingDate} disabled={isAddingDate}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
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
  backButton: {
    marginTop: 16,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#03dac6',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIcon: {
    margin: 0,
    padding: 0,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
  },
  nickname: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    marginRight: 4,
  },
  metDate: {
    marginTop: 8,
    opacity: 0.7,
  },
  notes: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  meta: {
    marginTop: 12,
    opacity: 0.6,
  },
  quickActionsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  quickActionsTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  quickActionsSubtitle: {
    opacity: 0.7,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  quickActionChip: {
    marginRight: 4,
  },
  importantDatesCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  importantDatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  importantDatesTitle: {
    fontWeight: 'bold',
  },
  importantDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateChip: {
    marginRight: 8,
  },
  noDateText: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  relationsCard: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  emptyRelations: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  relationItem: {
    paddingVertical: 8,
  },
  connectionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#03dac6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  connectionAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  spacer: {
    height: 40,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
