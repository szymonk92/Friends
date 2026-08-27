import { StyleSheet, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { usePerson, usePeople, useMePerson } from '@/hooks/usePeople';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePersonRelations } from '@/hooks/useRelations';
import { usePersonContactEvents } from '@/hooks/useContactEvents';
import { usePersonPhotos } from '@/hooks/usePhotos';
import { getInitials, formatYearsKnown } from '@/lib/utils/format';
import { LIKES } from '@/lib/constants/relations';
import { ChainLogo } from '@/components/ChainLogo';
import { Pill } from '@/components/Pill';
import { fz, fzText } from '@/lib/design/tokens';

function Avatar({
  name,
  photoUri,
  size,
}: {
  name: string;
  photoUri: string | null | undefined;
  size: number;
}) {
  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.32 }]}>{getInitials(name)}</Text>
    </View>
  );
}

export default function RelationshipScreen() {
  const { personId, compareToId } = useLocalSearchParams<{ personId: string; compareToId?: string }>();
  const { data: person, isLoading: personLoading } = usePerson(personId!);
  const { data: me } = useMePerson();
  const { data: comparePersonRaw, isLoading: compareLoading } = usePerson(compareToId ?? '');
  const isComparingToSelf = !compareToId;
  const other = isComparingToSelf ? me : comparePersonRaw;
  const otherId = other?.id ?? '';
  const { data: allPeople = [] } = usePeople();
  const { data: otherPhotos = [] } = usePersonPhotos(otherId);
  const { data: personPhotos = [] } = usePersonPhotos(personId!);

  const { data: otherConnections = [] } = usePersonConnections(otherId);
  const { data: theirConnections = [] } = usePersonConnections(personId!);
  const { data: otherRelations = [] } = usePersonRelations(otherId);
  const { data: theirRelations = [] } = usePersonRelations(personId!);
  const { data: contactEvents = [] } = usePersonContactEvents(personId!);

  const otherPhoto = other?.photoId ? otherPhotos.find((p) => p.id === other.photoId) : null;
  const personPhoto = person?.photoId ? personPhotos.find((p) => p.id === person.photoId) : null;

  const otherIdOf = (c: { person1Id: string; person2Id: string }, selfId: string) =>
    c.person1Id === selfId ? c.person2Id : c.person1Id;

  const mutualConnectionIds = useMemo(() => {
    if (!other) return new Set<string>();
    const mine = new Set(otherConnections.map((c) => otherIdOf(c, other.id)));
    const theirs = theirConnections.map((c) => otherIdOf(c, personId!));
    return new Set(theirs.filter((id) => mine.has(id) && id !== personId && id !== other.id));
  }, [otherConnections, theirConnections, other, personId]);

  // Direct edge between the two people being compared, if one exists.
  const directConnection = useMemo(() => {
    if (isComparingToSelf || !other) return null;
    return theirConnections.find((c) => otherIdOf(c, personId!) === other.id) ?? null;
  }, [theirConnections, personId, other, isComparingToSelf]);

  const isConnected = isComparingToSelf || !!directConnection;

  const inCommon = useMemo(() => {
    const mine = new Set(
      otherRelations.filter((r) => r.relationType === LIKES).map((r) => r.objectLabel.toLowerCase())
    );
    return theirRelations
      .filter((r) => r.relationType === LIKES && mine.has(r.objectLabel.toLowerCase()))
      .map((r) => r.objectLabel);
  }, [otherRelations, theirRelations]);

  if (personLoading || compareLoading || !person || !other) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
      </View>
    );
  }

  const yearsKnown = person.metDate ? formatYearsKnown(new Date(person.metDate)) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Relationship',
          headerStyle: { backgroundColor: fz.paper },
          headerTintColor: fz.ink,
          headerTitleStyle: { fontFamily: fz.font, fontWeight: '600', fontSize: 18 },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.wrapper}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* the pair */}
          <View style={styles.pairRow}>
            <Avatar name={isComparingToSelf ? 'Me' : other.name} photoUri={otherPhoto?.filePath} size={74} />
            <ChainLogo size={50} strokeWidth={6.5} color={fz.ink} connected={isConnected} />
            <Avatar name={person.name} photoUri={personPhoto?.filePath} size={74} />
          </View>

          <Text style={styles.pairTitle}>
            {isComparingToSelf ? 'You' : other.name.split(' ')[0]} &amp; {person.name.split(' ')[0]}
          </Text>
          {isComparingToSelf && person.relationshipType && (
            <Text style={styles.pairSub}>
              {person.relationshipType.charAt(0).toUpperCase() + person.relationshipType.slice(1)}
              {person.metLocation ? ` · Met in ${person.metLocation}` : ''}
            </Text>
          )}
          {!isComparingToSelf && directConnection && (
            <Text style={styles.pairSub}>
              {directConnection.relationshipType.charAt(0).toUpperCase() +
                directConnection.relationshipType.slice(1)}
              {directConnection.qualifier ? ` · ${directConnection.qualifier}` : ''}
            </Text>
          )}
          {!isComparingToSelf && !directConnection && (
            <Text style={[styles.pairSub, styles.notConnected]}>Not connected yet</Text>
          )}

          {/* stats */}
          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{yearsKnown ?? '—'}</Text>
              <Text style={styles.statLabel}>known</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{contactEvents.length}</Text>
              <Text style={styles.statLabel}>notes</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{mutualConnectionIds.size}</Text>
              <Text style={styles.statLabel}>mutuals</Text>
            </View>
          </View>

          {/* how you met */}
          {(person.metDate || person.metLocation) && (
            <View style={styles.card}>
              <Text style={fzText.label}>{isComparingToSelf ? 'How you met' : `How you met ${person.name.split(' ')[0]}`}</Text>
              <Text style={styles.cardBody}>
                {[
                  person.metLocation ? `Met in ${person.metLocation}` : null,
                  person.metDate ? new Date(person.metDate).getFullYear().toString() : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          )}

          {/* in common */}
          {inCommon.length > 0 && (
            <View style={styles.card}>
              <Text style={fzText.label}>In common</Text>
              <View style={styles.chips}>
                {inCommon.map((label) => (
                  <Pill key={label} label={label} variant="surface" />
                ))}
              </View>
            </View>
          )}

          {/* mutual connections */}
          <View style={styles.card}>
            <Text style={fzText.label}>Mutual connections</Text>
            {mutualConnectionIds.size === 0 ? (
              <Text style={styles.emptyText}>No mutual connections yet.</Text>
            ) : (
              <View style={styles.mutualsRow}>
                {[...mutualConnectionIds].slice(0, 6).map((id, i) => {
                  const mutual = allPeople.find((p) => p.id === id);
                  if (!mutual) return null;
                  return (
                    <View key={id} style={[styles.mutualAvatar, i > 0 && styles.mutualOverlap]}>
                      <Text style={styles.mutualInitials}>{getInitials(mutual.name)}</Text>
                    </View>
                  );
                })}
                <Text style={styles.mutualNames} numberOfLines={1}>
                  {[...mutualConnectionIds]
                    .map((id) => allPeople.find((p) => p.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            )}
          </View>

          <Button
            mode="contained"
            buttonColor={fz.ink}
            style={styles.timelineButton}
            contentStyle={styles.timelineButtonContent}
            labelStyle={fzText.chipOn}
            onPress={() => router.push(`/(tabs)/timeline?filterPersonId=${personId}`)}
          >
            View shared timeline
          </Button>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: fz.paper },
  scroll: { paddingHorizontal: fz.s.edge, paddingTop: 22, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: fz.paper },
  avatarFallback: {
    backgroundColor: fz.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '600', fontFamily: fz.font },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  pairTitle: {
    ...fzText.titleLg,
    textAlign: 'center',
    marginTop: 14,
  },
  pairSub: {
    ...fzText.sub,
    textAlign: 'center',
    marginTop: 2,
  },
  notConnected: {
    fontStyle: 'italic',
    color: fz.textMute,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: fz.card,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    borderRadius: fz.rCard - 4,
    paddingVertical: 11,
  },
  statValue: { fontFamily: fz.font, fontWeight: '600', fontSize: 18, color: fz.ink },
  statLabel: { fontFamily: fz.font, fontWeight: '400', fontSize: 11, color: fz.textMute },
  card: {
    backgroundColor: fz.card,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    borderRadius: fz.rCard,
    padding: 17,
    marginTop: 12,
  },
  cardBody: { ...fzText.body, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  emptyText: { ...fzText.sub, fontStyle: 'italic', marginTop: 6 },
  mutualsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  mutualAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: fz.card,
    borderWidth: 1.5,
    borderColor: fz.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutualOverlap: { marginLeft: -9 },
  mutualInitials: { fontFamily: fz.font, fontWeight: '600', fontSize: 12, color: fz.ink },
  mutualNames: { ...fzText.sub, marginLeft: 12, flexShrink: 1 },
  timelineButton: { marginTop: 20, borderRadius: fz.rButton },
  timelineButtonContent: { height: 50 },
});
