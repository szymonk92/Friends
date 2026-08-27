import { StyleSheet, View, Alert } from 'react-native';
import {
  Text,
  Button,
  Portal,
  Dialog,
  TextInput as PaperInput,
  SegmentedButtons,
} from 'react-native-paper';
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

interface PersonGiftIdeasProps {
  personId: string;
  personName: string;
}

export default function PersonGiftIdeas({ personId, personName }: PersonGiftIdeasProps) {
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
      Alert.alert('Error', 'Please enter a gift idea');
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
      Alert.alert('Success', 'Gift idea added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add gift idea');
    } finally {
      setIsAddingGift(false);
    }
  };

  const handleMarkGiftGiven = (giftId: string, item: string) => {
    Alert.alert('Mark as Given', `Mark "${item}" as given?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Given',
        onPress: () => updateGiftIdea.mutateAsync({ id: giftId, given: true }),
      },
    ]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#d32f2f';
      case 'medium':
        return '#ff9800';
      case 'low':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  return (
    <>
      <ProfileSection
        label="Gift Ideas"
        count={giftIdeas.length || null}
        onAdd={() => setAddGiftDialogVisible(true)}
        onMore={() => router.push(`/person/manage-gifts?personId=${personId}`)}
      >
        {giftIdeas.length === 0 ? (
          <Text style={styles.empty}>No gift ideas yet. Add ideas for {personName}!</Text>
        ) : (
          giftIdeas.map((gift) => (
            <View key={gift.id} style={styles.giftItem}>
              <View style={styles.giftInfo}>
                <View style={styles.giftHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
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
                  </View>
                  <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(gift.priority) }]} />
                </View>
                {gift.occasion && (
                  <Text style={styles.giftOccasion}>For: {gift.occasion}</Text>
                )}
                {gift.notes && <Text style={styles.giftNotes}>{gift.notes}</Text>}
                {gift.status === 'given' && gift.givenDate && (
                  <Text style={styles.giftGivenDate}>Given on {formatShortDate(gift.givenDate)}</Text>
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
          <Dialog.Title style={styles.dialogTitle}>Add Gift Idea</Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
              label="Gift Item *"
              placeholder="e.g., Hiking boots, Coffee machine"
              value={giftItem}
              onChangeText={setGiftItem}
              style={[{ marginBottom: 12 }, styles.dialogFont]}
            />

            <Text variant="labelMedium" style={[{ marginBottom: 8 }, styles.dialogFont]}>
              Priority
            </Text>
            <SegmentedButtons
              value={giftPriority}
              onValueChange={(v) => setGiftPriority(v as 'low' | 'medium' | 'high')}
              buttons={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
              style={{ marginBottom: 12 }}
            />

            <PaperInput
              mode="outlined"
              label="Occasion (optional)"
              placeholder="e.g., Birthday, Christmas"
              value={giftOccasion}
              onChangeText={setGiftOccasion}
              style={[{ marginBottom: 12 }, styles.dialogFont]}
            />

            <PaperInput
              mode="outlined"
              label="Notes (optional)"
              placeholder="Size, color, where to buy, etc."
              value={giftNotes}
              onChangeText={setGiftNotes}
              multiline
              numberOfLines={2}
              style={styles.dialogFont}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={() => setAddGiftDialogVisible(false)}>
              Cancel
            </Button>
            <Button
              labelStyle={styles.dialogFont}
              onPress={handleAddGiftIdea}
              loading={isAddingGift}
              disabled={isAddingGift}
            >
              Add
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
    alignItems: 'flex-start',
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
  giftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  giftItemText: {
    ...fzText.name,
    fontSize: 14.5,
  },
  giftGiven: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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