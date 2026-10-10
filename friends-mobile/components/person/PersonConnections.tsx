import { StyleSheet, View } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePeople, type PersonWithPhoto } from '@/hooks/usePeople';
import { PersonRow } from '@/components/PersonRow';
import { ProfileSection } from './ProfileSection';
import { connectionStatusLabel } from '@/lib/i18n/labels';
import { Pill } from '@/components/Pill';
import { fz, fzText } from '@/lib/design/tokens';
import { describeConnection } from '@/lib/connections/describeConnection';
import type { Connection } from '@/lib/db/schema';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ActionSheet } from '@/components/ActionSheet';

interface PersonConnectionsProps {
  personId: string;
  personName: string;
}

export default function PersonConnections({ personId, personName }: PersonConnectionsProps) {
  const { t } = useTranslation();
  const { data: personConnections = [], isLoading: connectionsLoading } =
    usePersonConnections(personId);
  const { data: allPeople = [] } = usePeople({ entityType: 'all' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getConnectedPerson = (connection: Connection): PersonWithPhoto | undefined => {
    const connectedId =
      connection.person1Id === personId ? connection.person2Id : connection.person1Id;
    return allPeople.find((p) => p.id === connectedId);
  };

  const selected = personConnections.find((c) => c.id === selectedId) ?? null;
  const selectedPerson = selected ? getConnectedPerson(selected) : undefined;

  return (
    <>
      <ProfileSection
        label={t('connections.title')}
        count={personConnections.length || null}
        onAdd={() => router.push(`/person/connection-form?personId=${personId}`)}
        empty={
          !connectionsLoading &&
          personConnections.length === 0 &&
          t('connections.empty', { name: personName })
        }
      >
        {connectionsLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={fz.ink} />
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
              subtitleLines={0}
              avatarVariant="ink"
              onPress={() => setSelectedId(connection.id)}
              right={
                !isPet && connection.status !== 'active' ? (
                  <Pill label={connectionStatusLabel(connection.status)} variant="soft" />
                ) : null
              }
            >
              {connection.notes ? <Text style={styles.notes}>{connection.notes}</Text> : null}
            </PersonRow>
          );
        })}
      </ProfileSection>

      <ActionSheet
        visible={selected !== null}
        title={selectedPerson?.name}
        onDismiss={() => setSelectedId(null)}
        actions={
          selected && selectedPerson
            ? [
                {
                  label: t('connections.openProfile'),
                  icon: 'arrowRight',
                  onPress: () => router.push(`/person/${selectedPerson.id}`),
                },
                {
                  label: t('screens.editConnection'),
                  icon: 'pencil',
                  onPress: () =>
                    router.push(
                      `/person/connection-form?connectionId=${selected.id}&fromPersonId=${personId}`
                    ),
                },
              ]
            : []
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { padding: 12, alignItems: 'center' },
  notes: {
    ...fzText.sub,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
