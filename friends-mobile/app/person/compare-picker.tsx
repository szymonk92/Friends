import { useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, ActivityIndicator, TextInput } from 'react-native-paper';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { usePeople, usePerson } from '@/hooks/usePeople';
import { PersonRow } from '@/components/PersonRow';
import { fz, fzText } from '@/lib/design/tokens';

// Lowercase, strip accents; ł has no decomposition so map it by hand.
const fold = (v: string) =>
  v
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function ComparePickerScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person } = usePerson(personId!);
  const { data: people = [], isLoading } = usePeople();

  const [query, setQuery] = useState('');

  const q = fold(query.trim());
  const candidates = people.filter(
    (p) => p.id !== personId && (!q || fold(`${p.name} ${p.nickname ?? ''}`).includes(q))
  );
  const noOthers = people.filter((p) => p.id !== personId).length === 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: person ? `Compare ${person.name.split(' ')[0]} with…` : 'Compare with…',
          headerStyle: { backgroundColor: fz.paper },
          headerTintColor: fz.ink,
          headerTitleStyle: { fontFamily: fz.font, fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={fz.ink} />
          </View>
        ) : noOthers ? (
          <View style={styles.centered}>
            <Text style={[fzText.sub, styles.emptyText]}>Add another person first to compare.</Text>
          </View>
        ) : (
          <>
            <TextInput
              mode="outlined"
              value={query}
              onChangeText={setQuery}
              placeholder="Search people..."
              left={<TextInput.Icon icon="magnify" />}
              autoCorrect={false}
              style={styles.search}
              outlineColor={fz.outline}
              activeOutlineColor={fz.ink}
              outlineStyle={styles.searchOutline}
            />
            <FlatList
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[fzText.sub, styles.emptyText]}>No one matches “{query.trim()}”.</Text>
              }
              data={candidates}
              keyExtractor={(p) => p.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <PersonRow
                  name={item.name}
                  photoPath={item.photoPath}
                  subtitle={
                    item.relationshipType &&
                    item.relationshipType.charAt(0).toUpperCase() + item.relationshipType.slice(1)
                  }
                  avatarSize={46}
                  avatarVariant="ink"
                  divider
                  onPress={() =>
                    router.replace(
                      `/person/relationship?personId=${personId}&compareToId=${item.id}`
                    )
                  }
                />
              )}
            />
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { textAlign: 'center' },
  search: {
    marginHorizontal: fz.s.edge,
    marginTop: 8,
    backgroundColor: fz.card,
    fontFamily: fz.font,
  },
  searchOutline: { borderRadius: fz.rRow },
  list: { paddingHorizontal: fz.s.edge, paddingTop: 8, paddingBottom: 40 },
});
