import { StyleSheet, View } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePeople, type PersonWithPhoto } from '@/hooks/usePeople';
import { PersonRow } from '@/components/PersonRow';
import { ProfileSection } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { fz, fzText } from '@/lib/design/tokens';
import { describeConnection } from '@/lib/connections/describeConnection';
import type { Connection } from '@/lib/db/schema';

interface PersonConnectionsProps {
  personId: string;
  personName: string;
}

export default function PersonConnections({ personId, personName }: PersonConnectionsProps) {
  const { data: personConnections = [], isLoading: connectionsLoading } = usePersonConnections(personId);
  const { data: allPeople = [] } = usePeople({ entityType: 'all' });

  const getConnectedPerson = (connection: Connection): PersonWithPhoto | undefined => {
    const connectedId =
      connection.person1Id === personId ? connection.person2Id : connection.person1Id;
    return allPeople.find((p) => p.id === connectedId);
  };

  return (
    <ProfileSection
      label="Connections"
      count={personConnections.length || null}
      onAdd={() => router.push(`/person/add-connection?personId=${personId}`)}
      onMore={() => router.push(`/person/manage-connections?personId=${personId}`)}
    >
      {connectionsLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={fz.ink} />
        </View>
      )}

      {!connectionsLoading && personConnections.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No connections yet. Add connections to show how {personName} relates to other people.
          </Text>
          <Button
            mode="outlined"
            textColor={fz.ink}
            style={styles.emptyButton}
            onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
          >
            Add Connection
          </Button>
        </View>
      )}

      {personConnections.map((connection) => {
        const connectedPerson = getConnectedPerson(connection);
        if (!connectedPerson) return null;
        const isPet = connection.relationshipType === 'pet';
        const description = describeConnection(connection, connectedPerson, personId);
        return (
          <PersonRow
            key={connection.id}
            name={connectedPerson.name}
            photoPath={connectedPerson.photoPath}
            subtitle={description}
            avatarVariant="ink"
            onPress={() =>
              router.push(
                `/person/edit-connection?connectionId=${connection.id}&fromPersonId=${personId}`
              )
            }
            right={
              !isPet && connection.status !== 'active' ? (
                <Pill label={connection.status} variant="soft" />
              ) : null
            }
          >
            {connection.notes ? (
              <Text style={styles.notes} numberOfLines={2}>{connection.notes}</Text>
            ) : null}
          </PersonRow>
        );
      })}

      {personConnections.length > 0 && (
        <Button
          mode="outlined"
          textColor={fz.ink}
          style={styles.addButton}
          onPress={() => router.push(`/person/add-connection?personId=${personId}`)}
        >
          Add Connection
        </Button>
      )}
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  centered: { padding: 12, alignItems: 'center' },
  emptyState: { paddingVertical: 10, alignItems: 'center' },
  emptyText: {
    ...fzText.sub,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyButton: { borderColor: fz.outline },
  notes: {
    ...fzText.sub,
    fontStyle: 'italic',
    marginTop: 2,
  },
  addButton: {
    marginTop: 14,
    borderColor: fz.outline,
  },
});