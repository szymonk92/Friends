import { StyleSheet, View } from 'react-native';
import {
  Text,
  Button,
  Portal,
  TextInput as PaperInput,
  SegmentedButtons,
} from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { useState } from 'react';
import {
  usePersonGiftIdeas,
  useCreateGiftIdea,
  useUpdateGiftIdea,
  useDeleteGiftIdea,
} from '@/hooks/useGifts';
import { ProfileSection, chipRow } from './ProfileSection';
import { formatShortDate } from '@/lib/utils/format';
import { Pill } from '@/components/Pill';
import { ActionSheet } from '@/components/ActionSheet';
import { confirmDestructive, fzAlert } from '@/lib/utils/confirm';
import { fz } from '@/lib/design/tokens';
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

  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [addGiftDialogVisible, setAddGiftDialogVisible] = useState(false);
  const [giftItem, setGiftItem] = useState('');
  const [giftNotes, setGiftNotes] = useState('');
  const [giftPriority, setGiftPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [giftOccasion, setGiftOccasion] = useState('');
  const [isAddingGift, setIsAddingGift] = useState(false);
  const selectedGift = giftIdeas.find((g) => g.id === selectedGiftId) ?? null;

  const handleAddGiftIdea = async () => {
    if (!giftItem.trim()) {
      fzAlert(t('common.error'), t('gifts.enterItem'));
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
    } catch (error) {
      fzAlert(t('common.error'), t('gifts.addFailed'));
    } finally {
      setIsAddingGift(false);
    }
  };

  const handleDeleteGift = (giftId: string, item: string) =>
    confirmDestructive({
      title: t('manageGifts.deleteTitle'),
      message: t('manageGifts.deleteMessage', { item }),
      onConfirm: () => deleteGiftIdea.mutateAsync(giftId),
    });

  return (
    <>
      <ProfileSection
        label={t('gifts.title')}
        count={giftIdeas.length || null}
        onAdd={() => setAddGiftDialogVisible(true)}
        empty={giftIdeas.length === 0 && t('gifts.empty', { name: personName })}
      >
        {giftIdeas.length > 0 && (
          <View style={chipRow}>
            {giftIdeas.map((gift) => (
              <Pill
                key={gift.id}
                label={gift.item}
                icon={gift.status === 'given' ? 'check' : 'gift'}
                variant={gift.status === 'given' ? 'outline' : 'surface'}
                onPress={() => setSelectedGiftId(gift.id)}
              />
            ))}
          </View>
        )}
      </ProfileSection>

      <ActionSheet
        visible={selectedGift !== null}
        title={selectedGift?.item}
        message={
          selectedGift
            ? [
                [t(`gifts.${selectedGift.priority ?? 'medium'}`), selectedGift.occasion]
                  .filter(Boolean)
                  .join(' · '),
                selectedGift.notes,
                selectedGift.status === 'given' && selectedGift.givenDate
                  ? t('manageGifts.given', { date: formatShortDate(selectedGift.givenDate) })
                  : null,
              ]
                .filter(Boolean)
                .join('\n')
            : null
        }
        onDismiss={() => setSelectedGiftId(null)}
        actions={
          selectedGift
            ? [
                ...(selectedGift.status !== 'given'
                  ? [
                      {
                        label: t('gifts.markGivenTitle'),
                        icon: 'check' as const,
                        onPress: () =>
                          updateGiftIdea.mutateAsync({ id: selectedGift.id, given: true }),
                      },
                    ]
                  : []),
                {
                  label: t('common.delete'),
                  icon: 'trash' as const,
                  onPress: () => handleDeleteGift(selectedGift.id, selectedGift.item),
                },
              ]
            : []
        }
      />

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
