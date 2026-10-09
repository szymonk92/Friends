import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { HeartIcon } from 'phosphor-react-native';
import { router } from 'expo-router';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePeople, type PersonWithPhoto } from '@/hooks/usePeople';
import { Avatar } from '@/components/Avatar';

type Props = {
  personId: string;
};

// Shows existing partners only — "Add partner" lives in the profile's ⋮ menu.
export default function PartnerBadge({ personId }: Props) {
  const theme = useTheme();
  const { data: personConnections = [] } = usePersonConnections(personId);
  const { data: allPeople = [] } = usePeople();

  // A person can have more than one partner — show them all.
  const partners = useMemo<PersonWithPhoto[]>(() => {
    return personConnections
      .filter((c) => c.relationshipType === 'partner' && c.status !== 'ended')
      .map((link) => {
        const otherId = link.person1Id === personId ? link.person2Id : link.person1Id;
        return allPeople.find((p) => p.id === otherId) ?? null;
      })
      .filter((p): p is PersonWithPhoto => p !== null);
  }, [personConnections, allPeople, personId]);

  if (partners.length === 0) return null;

  return (
    <View style={styles.stack}>
      {partners.map((partner) => (
        <Pressable
          key={partner.id}
          onPress={() => router.push(`/person/${partner.id}`)}
          style={styles.row}
        >
          <HeartIcon size={14} color={theme.colors.onSurface} weight="fill" />
          <Avatar name={partner.name} photoPath={partner.photoPath} size={24} variant="ink" />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            {partner.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
  },
});
