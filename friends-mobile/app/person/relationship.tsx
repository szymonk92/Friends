import { StyleSheet, View, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { useMemo } from 'react';
import { usePerson, usePeople, useMePerson } from '@/hooks/usePeople';
import { usePersonConnections } from '@/hooks/useConnections';
import { usePersonRelations } from '@/hooks/useRelations';
import { usePersonContactEvents } from '@/hooks/useContactEvents';
import { usePersonPhotos } from '@/hooks/usePhotos';
import { getInitials, formatYearsKnown } from '@/lib/utils/format';
import { LIKES } from '@/lib/constants/relations';
import { ChainLogo } from '@/components/ChainLogo';
import { relationshipTypeLabel } from '@/lib/i18n/labels';
import { Pill } from '@/components/Pill';
import { fz, fzText } from '@/lib/design/tokens';
import { Avatar } from '@/components/Avatar';
import { useTranslation } from 'react-i18next';

export default function RelationshipScreen() {
  const { t } = useTranslation();
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

  const peopleById = useMemo(() => {
    const m = new Map(allPeople.map((p) => [p.id, p]));
    if (me) m.set(me.id, me);
    return m;
  }, [allPeople, me]);

  const mutualConnectionIds = useMemo(() => {
    if (!other) return new Set<string>();
    const theirs = new Set(
      theirConnections
        .map((c) => otherIdOf(c, personId!))
        .filter((id) => id !== personId && id !== other.id && id !== me?.id)
    );
    // Comparing to yourself: everyone this person is connected to is someone you know.
    if (isComparingToSelf) return theirs;
    const mine = new Set(otherConnections.map((c) => otherIdOf(c, other.id)));
    return new Set([...theirs].filter((id) => mine.has(id)));
  }, [otherConnections, theirConnections, other, personId, isComparingToSelf, me]);

  // Direct edge between the two people being compared, if one exists.
  const directConnection = useMemo(() => {
    if (isComparingToSelf || !other) return null;
    return theirConnections.find((c) => otherIdOf(c, personId!) === other.id) ?? null;
  }, [theirConnections, personId, other, isComparingToSelf]);

  const isConnected = isComparingToSelf || !!directConnection;
  const isPartner = isComparingToSelf
    ? person?.relationshipType === 'partner'
    : directConnection?.relationshipType === 'partner' && directConnection.status !== 'ended';

  const likes = useMemo(() => {
    const likeLabels = (rs: typeof otherRelations) =>
      rs.filter((r) => r.relationType === LIKES).map((r) => r.objectLabel);
    const otherLikes = likeLabels(otherRelations);
    const personLikes = likeLabels(theirRelations);
    const otherSet = new Set(otherLikes.map((l) => l.toLowerCase()));
    const common = personLikes.filter((l) => otherSet.has(l.toLowerCase()));
    const commonSet = new Set(common.map((l) => l.toLowerCase()));
    return {
      common,
      otherOnly: otherLikes.filter((l) => !commonSet.has(l.toLowerCase())),
      personOnly: personLikes.filter((l) => !commonSet.has(l.toLowerCase())),
    };
  }, [otherRelations, theirRelations]);

  if (personLoading || compareLoading || !person || !other) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={fz.ink} />
      </View>
    );
  }

  const yearsKnown = isComparingToSelf
    ? person.metDate
      ? formatYearsKnown(new Date(person.metDate))
      : null
    : directConnection?.startDate
      ? formatYearsKnown(new Date(directConnection.startDate))
      : null;

  return (
    <>
      <AppBar title={t('relationship.title')} />
      <View style={styles.wrapper}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* the pair */}
          <View style={styles.pairRow}>
            <Avatar name={isComparingToSelf ? t('relationship.me') : other.name} photoPath={otherPhoto?.filePath} size={74} variant="ink" />
            <ChainLogo size={50} strokeWidth={6.5} color={fz.ink} variant={isPartner ? 'partner' : isConnected ? 'linked' : 'apart'} />
            <Avatar name={person.name} photoPath={personPhoto?.filePath} size={74} variant="ink" />
          </View>

          <Text style={styles.pairTitle}>
            {isComparingToSelf ? t('relationship.you') : other.name.split(' ')[0]} &amp; {person.name.split(' ')[0]}
          </Text>
          {isComparingToSelf && person.relationshipType && (
            <Text style={styles.pairSub}>
              {relationshipTypeLabel(person.relationshipType)}
              {person.metLocation
                ? ` · ${t('relationship.metIn', { place: person.metLocation })}`
                : ''}
            </Text>
          )}
          {!isComparingToSelf && directConnection && (
            <Text style={styles.pairSub}>
              {relationshipTypeLabel(directConnection.relationshipType)}
              {directConnection.qualifier ? ` · ${directConnection.qualifier}` : ''}
            </Text>
          )}
          {!isComparingToSelf && !directConnection && (
            <Text style={[styles.pairSub, styles.notConnected]}>{t('relationship.notConnected')}</Text>
          )}

          {/* stats */}
          <View style={styles.statsRow}>
            <Pressable
              style={styles.statTile}
              disabled={!directConnection || !!yearsKnown}
              onPress={() =>
                router.push(
                  `/person/edit-connection?connectionId=${directConnection!.id}&fromPersonId=${personId}`
                )
              }
            >
              <Text style={styles.statValue}>
                {yearsKnown ?? (directConnection ? t('relationship.addDate') : '—')}
              </Text>
              <Text style={styles.statLabel}>{t('relationship.known')}</Text>
            </Pressable>
            {isComparingToSelf && (
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{contactEvents.length}</Text>
                <Text style={styles.statLabel}>{t('relationship.notes')}</Text>
              </View>
            )}
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{mutualConnectionIds.size}</Text>
              <Text style={styles.statLabel}>{t('relationship.mutuals')}</Text>
            </View>
          </View>

          {/* how they met (two other people) */}
          {!isComparingToSelf && directConnection?.notes ? (
            <View style={styles.card}>
              <Text style={fzText.label}>{t('relationship.howTheyMet')}</Text>
              <Text style={styles.cardBody}>{directConnection.notes}</Text>
            </View>
          ) : null}

          {/* how you met */}
          {isComparingToSelf && (person.metDate || person.metLocation) && (
            <View style={styles.card}>
              <Text style={fzText.label}>{t('relationship.howYouMet')}</Text>
              <Text style={styles.cardBody}>
                {[
                  person.metLocation ? t('relationship.metIn', { place: person.metLocation }) : null,
                  person.metDate ? new Date(person.metDate).getFullYear().toString() : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          )}
          {!isComparingToSelf && directConnection && (directConnection.qualifier || directConnection.notes) && (
            <View style={styles.card}>
              <Text style={fzText.label}>{t('relationship.howTheyKnow')}</Text>
              <Text style={styles.cardBody}>
                {[directConnection.qualifier, directConnection.notes].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}

          {/* interests */}
          {(likes.common.length > 0 || likes.otherOnly.length > 0 || likes.personOnly.length > 0) && (
            <View style={styles.card}>
              <Text style={fzText.label}>{t('relationship.interests')}</Text>
              {likes.common.length > 0 && (
                <>
                  <Text style={styles.likesWho}>{t('relationship.inCommon')}</Text>
                  <View style={styles.chips}>
                    {likes.common.map((label) => (
                      <Pill key={`c-${label}`} label={label} variant="surface" />
                    ))}
                  </View>
                </>
              )}
              {likes.otherOnly.length > 0 && (
                <>
                  <Text style={styles.likesWho}>
                    {isComparingToSelf
                      ? t('relationship.youLike')
                      : t('relationship.nameLikes', { name: other.name.split(' ')[0] })}
                  </Text>
                  <View style={styles.chips}>
                    {likes.otherOnly.map((label) => (
                      <Pill key={`o-${label}`} label={label} variant="surface" />
                    ))}
                  </View>
                </>
              )}
              {likes.personOnly.length > 0 && (
                <>
                  <Text style={styles.likesWho}>
                    {t('relationship.nameLikes', { name: person.name.split(' ')[0] })}
                  </Text>
                  <View style={styles.chips}>
                    {likes.personOnly.map((label) => (
                      <Pill key={`p-${label}`} label={label} variant="surface" />
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* mutual connections */}
          <View style={styles.card}>
            <Text style={fzText.label}>{t('relationship.mutualConnections')}</Text>
            {mutualConnectionIds.size === 0 ? (
              <Text style={styles.emptyText}>{t('relationship.noMutuals')}</Text>
            ) : (
              <View style={styles.mutualsRow}>
                {[...mutualConnectionIds].slice(0, 6).map((id, i) => {
                  const mutual = peopleById.get(id);
                  if (!mutual) return null;
                  return (
                    <View key={id} style={[styles.mutualAvatar, i > 0 && styles.mutualOverlap]}>
                      <Text style={styles.mutualInitials}>
                        {getInitials(mutual.name)}
                      </Text>
                    </View>
                  );
                })}
                <Text style={styles.mutualNames} numberOfLines={1}>
                  {[...mutualConnectionIds]
                    .map((id) => (id === me?.id ? t('relationship.you') : peopleById.get(id)?.name))
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
            {t('relationship.viewTimeline')}
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
  likesWho: { ...fzText.sub, marginTop: 10, marginBottom: 2 },
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
