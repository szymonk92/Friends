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
} from 'react-native-paper';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { usePerson, useDeletePerson, usePeople } from '@/hooks/usePeople';
import { usePersonRelations, useDeleteRelation } from '@/hooks/useRelations';
import { usePersonConnections, useDeleteConnection } from '@/hooks/useConnections';
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
