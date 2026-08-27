import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePeople, type PersonWithPhoto } from '@/hooks/usePeople';
import { getInitials } from '@/lib/utils/format';
import { ProfileSection } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { fz, fzText } from '@/lib/design/tokens';
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
        const isPet = connectedPerson.entityType === 'pet';
        const isChild = connection.relationshipType === 'child';
        // Connections are directional: person1Id is who the connection was created from
        // (the owner/parent). If that isn't the profile we're on, we're viewing the
        // pet/child and looking back at the owner/parent.
        const viewingConnectedEntity = connection.person1Id !== personId;
        const description = isPet
          ? viewingConnectedEntity
            ? 'Owner'
            : `🐾 ${connectedPerson.species?.trim() || 'Pet'}`
          : isChild
            ? viewingConnectedEntity
              ? 'Parent'
              : `Child${connection.qualifier ? ` • ${connection.qualifier}` : ''}`
            : `${connection.relationshipType}${connection.qualifier ? ` • ${connection.qualifier}` : ''}${connection.status !== 'active' ? ` • ${connection.status}` : ''}`;
        return (
          <TouchableOpacity
            key={connection.id}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => router.replace(`/person/${connectedPerson.id}`)}
          >
            {connectedPerson.photoPath ? (
              <Image source={{ uri: connectedPerson.photoPath }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{getInitials(connectedPerson.name)}</Text>
              </View>
            )}
            <View style={styles.rowBody}>
              <Text style={fzText.name} numberOfLines={1}>{connectedPerson.name}</Text>
              <Text style={fzText.sub} numberOfLines={1}>{description}</Text>
              {connection.notes ? (
                <Text style={styles.notes} numberOfLines={2}>{connection.notes}</Text>
              ) : null}
            </View>
            {!isPet && <Pill label={connection.status} variant="soft" />}
          </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: fz.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fz.font,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
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