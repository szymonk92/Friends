import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, List, IconButton, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePeople } from '@/hooks/usePeople';
import { formatRelativeTime } from '@/lib/utils/format';
import { describeConnection } from '@/lib/connections/describeConnection';
import { Avatar } from '@/components/Avatar';
import { fz } from '@/lib/design/tokens';

export default function ManageConnectionsScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: allPeople = [] } = usePeople({ entityType: 'all' });
  const { data: connections = [], isLoading } = usePersonConnections(personId!);

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
                  description={`${describeConnection(connection, connectedPerson, personId!)} • ${formatRelativeTime(new Date(connection.createdAt))}`}
                  left={() => (
                    <TouchableOpacity
                      onPress={() => router.push(`/person/${connectedPerson.id}`)}
                      style={styles.avatarTouchable}
                    >
                      <Avatar name={connectedPerson.name} photoPath={connectedPerson.photoPath} />
                    </TouchableOpacity>
                  )}
                  right={() => (
                    <IconButton
                      icon="pencil"
                      size={24}
                      onPress={() =>
                        router.push(
                          `/person/edit-connection?connectionId=${connection.id}&fromPersonId=${personId}`
                        )
                      }
                    />
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
    backgroundColor: fz.paper,
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
  avatarTouchable: {
    marginLeft: 8,
  },
  spacer: {
    height: 40,
  },
});
