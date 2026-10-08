import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, IconButton, ActivityIndicator, Button } from 'react-native-paper';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePeople } from '@/hooks/usePeople';
import { formatRelativeTime } from '@/lib/utils/format';
import { describeConnection } from '@/lib/connections/describeConnection';
import { PersonRow } from '@/components/PersonRow';
import { fz } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

export default function ManageConnectionsScreen() {
  const { t } = useTranslation();
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
          title: t('screens.manageConnections'),
          headerRight: () => (
            <IconButton
              icon="plus"
              onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
            />
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.list}>
        {connections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('manageConnections.empty')}</Text>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
              style={styles.addButton}
            >
              {t('connections.add')}
            </Button>
          </View>
        ) : (
          connections
            .map((connection) => {
              const connectedPerson = getConnectedPerson(connection);
              return connectedPerson ? { connection, connectedPerson } : null;
            })
            .filter((item): item is { connection: any; connectedPerson: any } => item !== null)
            .map(({ connection, connectedPerson }) => (
              <PersonRow
                key={connection.id}
                name={connectedPerson.name}
                photoPath={connectedPerson.photoPath}
                subtitle={`${describeConnection(connection, connectedPerson, personId!)} • ${formatRelativeTime(new Date(connection.createdAt))}`}
                divider
                onPress={() => router.push(`/person/${connectedPerson.id}`)}
                right={
                  <IconButton
                    icon="pencil"
                    size={22}
                    onPress={() =>
                      router.push(
                        `/person/edit-connection?connectionId=${connection.id}&fromPersonId=${personId}`
                      )
                    }
                  />
                }
              />
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
  list: {
    paddingHorizontal: fz.s.edge,
  },
  spacer: {
    height: 40,
  },
});
