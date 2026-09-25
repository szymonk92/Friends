import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, View, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { usePeople, type PersonWithPhoto } from '@/hooks/usePeople';
import { useMePerson } from '@/hooks/usePeople';
import { useRelations } from '@/hooks/useRelations';
import { LIKES } from '@/lib/constants/relations';
import { getInitials } from '@/lib/utils/format';
import { fz, fzText } from '@/lib/design/tokens';
import { HeaderBack } from '@/components/HeaderBack';

type Interest = {
  label: string;
  people: PersonWithPhoto[];
};

export default function SharedInterestsScreen() {
  const insets = useSafeAreaInsets();
  const { data: people = [], isLoading: loadingPeople } = usePeople();
  const { data: me } = useMePerson();
  const { data: relations = [], isLoading: loadingRelations } = useRelations();

  const interests = useMemo<Interest[]>(() => {
    const bySubject = new Map<string, PersonWithPhoto>();
    for (const p of people) bySubject.set(p.id, p);
    if (me) bySubject.set(me.id, { ...me, photoPath: null });

    const groups = new Map<string, Map<string, PersonWithPhoto>>();
    for (const r of relations) {
      if (r.relationType !== LIKES) continue;
      const person = bySubject.get(r.subjectId);
      if (!person) continue;
      const key = r.objectLabel.trim().toLowerCase();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, new Map());
      groups.get(key)!.set(person.id, person);
    }

    return Array.from(groups.entries())
      .map(([key, peopleMap]) => ({
        label: relations.find((r) => r.relationType === LIKES && r.objectLabel.trim().toLowerCase() === key)!
          .objectLabel.trim(),
        people: Array.from(peopleMap.values()),
      }))
      .filter((i) => i.people.length >= 2)
      .sort((a, b) => b.people.length - a.people.length);
  }, [relations, people, me]);

  const isLoading = loadingPeople || loadingRelations;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.appBarRow}>
          <HeaderBack onPress={() => router.back()} />
          <Text style={fzText.screenTitle}>Shared interests</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={[fzText.meta, styles.subtitle]}>What your circle has in common</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fz.ink} />
        </View>
      ) : interests.length === 0 ? (
        <View style={styles.centered}>
          <Text style={fzText.title}>Nothing shared yet</Text>
          <Text style={[fzText.sub, styles.emptySub]}>
            Once two or more people share a like, it'll show up here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {interests.map((interest) => (
            <View key={interest.label} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={fzText.name}>{interest.label}</Text>
                <View style={[styles.countPill, interest.people.length >= 3 && styles.countPillSolid]}>
                  <Text style={interest.people.length >= 3 ? fzText.chipOn : fzText.chip}>
                    {interest.people.length} people
                  </Text>
                </View>
              </View>
              <View style={styles.avatarRow}>
                {interest.people.slice(0, 6).map((p, i) => (
                  <View key={p.id} style={[styles.avatar, i > 0 && styles.avatarOverlap]}>
                    <Text style={styles.avatarText}>{getInitials(p.name)}</Text>
                  </View>
                ))}
                <Text style={styles.namesText} numberOfLines={1}>
                  {interest.people.map((p) => p.name.split(' ')[0]).join(', ')}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptySub: { marginTop: 8, textAlign: 'center' },
  appBar: { backgroundColor: fz.paper },
  appBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: fz.s.edge,
  },
  subtitle: {
    paddingHorizontal: fz.s.edge,
    paddingTop: 2,
    paddingBottom: fz.s.md,
  },
  list: {
    paddingHorizontal: fz.s.edge,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: fz.card,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    borderRadius: fz.rCard,
    padding: 17,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: fz.rPill,
    backgroundColor: fz.surface,
  },
  countPillSolid: {
    backgroundColor: fz.ink,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: fz.card,
    borderWidth: 1.5,
    borderColor: fz.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlap: { marginLeft: -9 },
  avatarText: { fontFamily: fz.font, fontWeight: '600', fontSize: 12, color: fz.ink },
  namesText: { ...fzText.sub, marginLeft: 12, flexShrink: 1 },
});
