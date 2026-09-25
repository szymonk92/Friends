import { StyleSheet, View, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { usePeople, usePerson } from '@/hooks/usePeople';
import { getInitials } from '@/lib/utils/format';
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
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() =>
                  router.replace(`/person/relationship?personId=${personId}&compareToId=${item.id}`)
                }
              >
                {item.photoPath ? (
                  <Image source={{ uri: item.photoPath }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                  </View>
                )}
                <View style={styles.rowInfo}>
                  <Text style={fzText.name}>{item.name}</Text>
                  {item.relationshipType && (
                    <Text style={fzText.sub}>
                      {item.relationshipType.charAt(0).toUpperCase() + item.relationshipType.slice(1)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: fz.hairline,
    gap: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: fz.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '600', fontSize: 15, fontFamily: fz.font },
  rowInfo: { flex: 1 },
});
