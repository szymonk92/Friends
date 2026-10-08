import { StyleSheet, View, Alert } from 'react-native';
import {
  Text,
  Button,
  Portal,
  TextInput as PaperInput,
  SegmentedButtons,
} from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  usePersonGiftIdeas,
  useCreateGiftIdea,
  useUpdateGiftIdea,
  useDeleteGiftIdea,
} from '@/hooks/useGifts';
import { formatShortDate } from '@/lib/utils/format';
import { ProfileSection } from './ProfileSection';
import { IconCircle } from '@/components/IconCircle';
import { fz, fzText } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

interface PersonGiftIdeasProps {
  personId: string;
  personName: string;
}

export default function PersonGiftIdeas({ personId, personName }: PersonGiftIdeasProps) {
  const { t } = useTranslation();
  const { data: giftIdeas = [] } = usePersonGiftIdeas(personId);
  const createGiftIdea = useCreateGiftIdea();
  const updateGiftIdea = useUpdateGiftIdea();
  const deleteGiftIdea = useDeleteGiftIdea();

  const [addGiftDialogVisible, setAddGiftDialogVisible] = useState(false);
  const [giftItem, setGiftItem] = useState('');
  const [giftNotes, setGiftNotes] = useState('');
  const [giftPriority, setGiftPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [giftOccasion, setGiftOccasion] = useState('');
  const [isAddingGift, setIsAddingGift] = useState(false);

  const handleAddGiftIdea = async () => {
    if (!giftItem.trim()) {
      Alert.alert(t('common.error'), t('gifts.enterItem'));
      return;
    }

    setIsAddingGift(true);
    try {
      await createGiftIdea.mutateAsync({
        personId,
        item: giftItem.trim(),
        notes: giftNotes.trim() || undefined,
        priority: giftPriority,
        occasion: giftOccasion.trim() || undefined,
      });
      setAddGiftDialogVisible(false);
      setGiftItem('');
      setGiftNotes('');
      setGiftPriority('medium');
      setGiftOccasion('');
      Alert.alert(t('common.success'), t('gifts.added'));
    } catch (error) {
      Alert.alert(t('common.error'), t('gifts.addFailed'));
    } finally {
      setIsAddingGift(false);
    }
  };

  const handleMarkGiftGiven = (giftId: string, item: string) => {
    Alert.alert(t('gifts.markGivenTitle'), t('gifts.markGivenMessage', { item }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('gifts.given'),
        onPress: () => updateGiftIdea.mutateAsync({ id: giftId, given: true }),
      },
    ]);
  };

  return (
    <>
      <ProfileSection
        label={t('gifts.title')}
        count={giftIdeas.length || null}
        onAdd={() => setAddGiftDialogVisible(true)}
        onMore={() => router.push(`/person/manage-gifts?personId=${personId}`)}
      >
        {giftIdeas.length === 0 ? (
          <Text style={styles.empty}>{t('gifts.empty', { name: personName })}</Text>
        ) : (
          giftIdeas.map((gift) => (
            <View key={gift.id} style={styles.giftItem}>
              <View style={styles.giftInfo}>
                <Text
                  style={[
                    styles.giftItemText,
                    gift.status === 'given' && styles.giftGiven,
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {gift.item}
                </Text>
                {gift.occasion && (
                  <Text style={styles.giftOccasion}>{t('gifts.forOccasion', { occasion: gift.occasion })}</Text>
                )}
                {gift.notes && <Text style={styles.giftNotes}>{gift.notes}</Text>}
                {gift.status === 'given' && gift.givenDate && (
                  <Text style={styles.giftGivenDate}>{t('gifts.givenOn', { date: formatShortDate(gift.givenDate) })}</Text>
                )}
              </View>
              <View style={styles.giftActions}>
                {gift.status !== 'given' && (
                  <IconCircle
                    icon="check"
                    size={30}
                    iconSize={16}
                    color="#4caf50"
                    onPress={() => handleMarkGiftGiven(gift.id, gift.item)}
                  />
                )}
                <IconCircle
                  icon="trash"
                  size={30}
                  iconSize={14}
                  onPress={() => deleteGiftIdea.mutateAsync(gift.id)}
                />
              </View>
            </View>
          ))
        )}
      </ProfileSection>

      <Portal>
        <Dialog
          visible={addGiftDialogVisible}
          onDismiss={() => setAddGiftDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t('gifts.addTitle')}</Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
              label={t('gifts.itemLabel')}
              placeholder={t('gifts.itemPlaceholder')}
              value={giftItem}
              onChangeText={setGiftItem}
              style={[{ marginBottom: 12 }, styles.dialogFont]}
            />

            <Text variant="labelMedium" style={[{ marginBottom: 8 }, styles.dialogFont]}>
              {t('gifts.priority')}
            </Text>
            <SegmentedButtons
              value={giftPriority}
              onValueChange={(v) => setGiftPriority(v as 'low' | 'medium' | 'high')}
              buttons={[
                { value: 'low', label: t('gifts.low') },
                { value: 'medium', label: t('gifts.medium') },
                { value: 'high', label: t('gifts.high') },
              ]}
              style={{ marginBottom: 12 }}
            />

            <PaperInput
              mode="outlined"
              label={t('gifts.occasionLabel')}
              placeholder={t('gifts.occasionPlaceholder')}
              value={giftOccasion}
              onChangeText={setGiftOccasion}
              style={[{ marginBottom: 12 }, styles.dialogFont]}
            />

            <PaperInput
              mode="outlined"
              label={t('gifts.notesLabel')}
              placeholder={t('gifts.notesPlaceholder')}
              value={giftNotes}
              onChangeText={setGiftNotes}
              multiline
              numberOfLines={2}
              style={styles.dialogFont}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={() => setAddGiftDialogVisible(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              labelStyle={styles.dialogFont}
              onPress={handleAddGiftIdea}
              loading={isAddingGift}
              disabled={isAddingGift}
            >
              {t('gifts.add')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  giftItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    padding: 14,
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
    borderWidth: 1,
    borderColor: fz.cardBorder,
  },
  giftInfo: {
    flex: 1,
  },
  giftItemText: {
    ...fzText.name,
    fontSize: 14.5,
  },
  giftGiven: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  giftOccasion: {
    ...fzText.sub,
    fontSize: 12,
    marginBottom: 2,
  },
  giftNotes: {
    ...fzText.sub,
    fontSize: 12,
    fontStyle: 'italic',
  },
  giftGivenDate: {
    ...fzText.time,
    color: '#4caf50',
    marginTop: 4,
  },
  giftActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  empty: {
    ...fzText.sub,
    fontStyle: 'italic',
  },
  dialog: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  dialogTitle: {
    fontFamily: fz.font,
  },
  dialogFont: {
    fontFamily: fz.font,
  },
});