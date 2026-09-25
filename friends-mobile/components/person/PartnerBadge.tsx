import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { HeartIcon } from 'phosphor-react-native';
import { router } from 'expo-router';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePeople, type PersonWithPhoto } from '@/hooks/usePeople';
import { getInitials } from '@/lib/utils/format';

type Props = {
  personId: string;
  // True when this person is the app owner's own partner (relationshipType === 'partner').
  // In that case there's nothing to "add" — hide the prompt.
  isOwnerPartner?: boolean;
};

export default function PartnerBadge({ personId, isOwnerPartner }: Props) {
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

  const addPartner = () =>
    router.push(`/person/add-connection?personId=${personId}&relationshipType=partner`);

  if (partners.length === 0) {
    if (isOwnerPartner) return null;
    return (
      <Button
        mode="text"
        compact
        icon="heart-outline"
        onPress={addPartner}
        style={styles.addButton}
        textColor={theme.colors.onSurfaceVariant}
      >
        Add partner
      </Button>
    );
  }

  // Partners exist — just show them. Don't prompt to add more.
  return (
    <View style={styles.stack}>
      {partners.map((partner) => (
        <Pressable
          key={partner.id}
          onPress={() => router.push(`/person/${partner.id}`)}
          style={styles.row}
        >
          <HeartIcon size={14} color={theme.colors.onSurface} weight="fill" />
          {partner.photoPath ? (
            <Image source={{ uri: partner.photoPath }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.colors.secondary }]}>
              <Text style={[styles.initials, { color: theme.colors.onSecondary }]}>
                {getInitials(partner.name)}
              </Text>
            </View>
          )}
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
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 11,
    fontWeight: '700',
  },
  addButton: {
    marginTop: 6,
    alignSelf: 'center',
  },
});
