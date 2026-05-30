import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePeople, type PersonWithPhoto } from '@/hooks/usePeople';
import { getInitials } from '@/lib/utils/format';

type Props = {
  personId: string;
};

export default function PartnerBadge({ personId }: Props) {
  const theme = useTheme();
  const { data: personConnections = [] } = usePersonConnections(personId);
  const { data: allPeople = [] } = usePeople();

  const partner = useMemo<PersonWithPhoto | null>(() => {
    const partnerLink = personConnections.find(
      (c) => c.relationshipType === 'partner' && c.status !== 'ended'
    );
    if (!partnerLink) return null;
    const otherId = partnerLink.person1Id === personId ? partnerLink.person2Id : partnerLink.person1Id;
    return allPeople.find((p) => p.id === otherId) ?? null;
  }, [personConnections, allPeople, personId]);

  if (!partner) {
    return (
      <Button
        mode="text"
        compact
        icon="heart-outline"
        onPress={() =>
          router.push(`/person/add-connection?personId=${personId}&relationshipType=partner`)
        }
        style={styles.addButton}
        textColor={theme.colors.onSurfaceVariant}
      >
        Add partner
      </Button>
    );
  }

  return (
    <Pressable onPress={() => router.push(`/person/${partner.id}`)} style={styles.row}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        💕
      </Text>
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
  );
}

const styles = StyleSheet.create({
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
