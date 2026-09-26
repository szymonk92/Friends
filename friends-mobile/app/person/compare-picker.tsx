import { StyleSheet, View, FlatList } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { usePeople, usePerson } from '@/hooks/usePeople';
import { PersonRow } from '@/components/PersonRow';
import { fz, fzText } from '@/lib/design/tokens';

export default function ComparePickerScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person } = usePerson(personId!);
  const { data: people = [], isLoading } = usePeople();

  const candidates = people.filter((p) => p.id !== personId);

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
        ) : candidates.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[fzText.sub, styles.emptyText]}>Add another person first to compare.</Text>
          </View>
        ) : (
          <FlatList
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
                  router.replace(`/person/relationship?personId=${personId}&compareToId=${item.id}`)
                }
              />
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { textAlign: 'center' },
  list: { paddingHorizontal: fz.s.edge, paddingTop: 8, paddingBottom: 40 },
});
