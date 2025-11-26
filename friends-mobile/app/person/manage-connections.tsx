import { StyleSheet, View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Text, List, IconButton, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePersonConnections, useDeleteConnection } from '@/hooks/useConnections';
import { usePeople } from '@/hooks/usePeople';
import { formatRelativeTime } from '@/lib/utils/format';
import { getInitials } from '@/lib/utils/format';
import { getRelationshipColor } from '@/lib/utils/format';

export default function ManageConnectionsScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: allPeople = [] } = usePeople();
  const { data: connections = [], isLoading } = usePersonConnections(personId!);
  const deleteConnection = useDeleteConnection();

  const handleDelete = (connectionId: string, personName: string) => {
    Alert.alert('Delete Connection', `Are you sure you want to delete the connection with ${personName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteConnection.mutateAsync(connectionId);
        },
      },
    ]);
  };

  const getConnectedPerson = (connection: any) => {
    const connectedId =
      connection.person1Id === personId ? connection.person2Id : connection.person1Id;
    return allPeople.find((p) => p.id === connectedId);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Manage Connections`,
          headerRight: () => (
            <IconButton
              icon="plus"
              onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
            />
          ),
        }}
      />

      <ScrollView style={styles.container}>
        {connections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No connections found</Text>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
              style={styles.addButton}
            >
              Add Connection
            </Button>
          </View>
        ) : (
          connections
            .map((connection) => {
              const connectedPerson = getConnectedPerson(connection);
              return connectedPerson ? { connection, connectedPerson } : null;
            })
            .filter((item): item is { connection: any; connectedPerson: any } => item !== null)
            .map(({ connection, connectedPerson }, index, array) => (
              <View key={connection.id}>
                <List.Item
                  title={connectedPerson.name}
                  description={`${connection.relationshipType}${connection.qualifier ? ` • ${connection.qualifier}` : ''}${connection.status !== 'active' ? ` • ${connection.status}` : ''} • ${formatRelativeTime(new Date(connection.createdAt))}`}
                  left={() =>
                    connectedPerson.photoPath ? (
                      <TouchableOpacity
                        onPress={() => router.push(`/person/${connectedPerson.id}`)}
                        style={styles.avatarTouchable}
                      >
                        <View style={[styles.avatar, { backgroundColor: getRelationshipColor(connection.relationshipType) }]}>
                          <Text style={styles.avatarText}>{getInitials(connectedPerson.name)}</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => router.push(`/person/${connectedPerson.id}`)}
                        style={styles.avatarTouchable}
                      >
                        <View style={[styles.avatar, { backgroundColor: getRelationshipColor(connection.relationshipType) }]}>
                          <Text style={styles.avatarText}>{getInitials(connectedPerson.name)}</Text>
                        </View>
                      </TouchableOpacity>
                    )
                  }
                  right={() => (
                    <View style={styles.actions}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() =>
                          router.push(`/person/edit-connection?connectionId=${connection.id}`)
                        }
                      />
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        iconColor="#d32f2f"
                        onPress={() => handleDelete(connection.id, connectedPerson.name)}
                      />
                    </View>
                  )}
                  style={styles.listItem}
                />
                {index < array.length - 1 && <Divider />}
              </View>
            ))
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  addButton: {
    marginTop: 10,
  },
  listItem: {
    backgroundColor: 'white',
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarTouchable: {
    marginLeft: 8,
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    height: 40,
  },
});