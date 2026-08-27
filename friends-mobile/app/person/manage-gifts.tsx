import { StyleSheet, View, ScrollView, ActivityIndicator, StatusBar, Text as RNText } from 'react-native';
import { confirmDestructive } from '@/lib/utils/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePersonGiftIdeas, useDeleteGiftIdea } from '@/hooks/useGifts';
import { usePerson } from '@/hooks/usePeople';
import { formatShortDate } from '@/lib/utils/format';
import { fz, fzText } from '@/lib/design/tokens';
import { HeaderBack } from '@/components/HeaderBack';
import { Pill } from '@/components/Pill';
import { IconCircle } from '@/components/IconCircle';

export default function ManageGiftsScreen() {
  const insets = useSafeAreaInsets();
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person } = usePerson(personId!);
  const { data: gifts = [], isLoading } = usePersonGiftIdeas(personId!);
  const deleteGift = useDeleteGiftIdea();

  const handleDelete = (giftId: string, item: string) => {
    confirmDestructive({
      title: 'Delete Gift Idea',
      message: `Are you sure you want to delete "${item}"?`,
      onConfirm: () => deleteGift.mutateAsync(giftId),
    });
  };

  const AppBar = () => (
    <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
      <View style={styles.appBarRow}>
        <HeaderBack onPress={() => router.back()} />
        <RNText style={fzText.screenTitle} numberOfLines={1}>
          {person?.name ? `${person.name} · Gifts` : 'Gifts'}
        </RNText>
        <View style={{ width: 38 }} />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <AppBar />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fz.ink} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
      <AppBar />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        {gifts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <RNText style={fzText.sub}>No gift ideas yet</RNText>
          </View>
        ) : (
          <View>
            {gifts.map((gift) => (
              <View key={gift.id} style={styles.giftCard}>
                <View style={styles.giftMain}>
                  <RNText
                    style={[
                      styles.giftItem,
                      gift.status === 'given' && styles.giftItemGiven,
                    ]}
                    numberOfLines={2}
                  >
                    {gift.item}
                  </RNText>

                  <View style={styles.chipsRow}>
                    <Pill label={gift.priority} variant={gift.priority === 'high' ? 'solid' : 'surface'} />
                    {gift.occasion && <Pill label={gift.occasion} variant="soft" />}
                  </View>

                  {gift.notes && (
                    <RNText style={styles.notesText} numberOfLines={2}>
                      {gift.notes}
                    </RNText>
                  )}
                  {gift.status === 'given' && gift.givenDate && (
                    <RNText style={styles.givenDateText}>
                      Given: {formatShortDate(gift.givenDate)}
                    </RNText>
                  )}
                </View>

                <IconCircle
                  icon="trash"
                  size={34}
                  iconSize={16}
                  onPress={() => handleDelete(gift.id, gift.item)}
                />
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  appBar: { backgroundColor: fz.paper, paddingBottom: fz.s.sm },
  appBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: fz.s.edge,
    paddingBottom: fz.s.sm,
  },
  scroll: { flex: 1 },
  scrollInner: { padding: fz.s.edge, paddingTop: fz.s.sm },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 32, alignItems: 'center' },
  giftCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: fz.card,
    borderRadius: fz.rRow,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    padding: fz.s.md,
    marginBottom: fz.s.sm,
  },
  giftMain: { flex: 1, marginRight: fz.s.sm, gap: fz.s.xs },
  giftItem: { ...fzText.name, color: fz.ink },
  giftItemGiven: { textDecorationLine: 'line-through', opacity: 0.55 },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  notesText: { ...fzText.body, fontStyle: 'italic', lineHeight: 18 },
  givenDateText: { ...fzText.time, color: fz.textMute },
});