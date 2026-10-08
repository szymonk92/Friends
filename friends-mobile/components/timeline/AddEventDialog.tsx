import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Text, Chip, SegmentedButtons, TextInput, Button } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { fz } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

interface AddEventDialogProps {
  visible: boolean;
  onDismiss: () => void;
  editingEvent: any;
  selectedPersonIds: string[];
  togglePersonId: (id: string) => void;
  people: any[];
  eventType: string;
  setEventType: (type: string) => void;
  eventTypes: any[];
  dateInput: string;
  setDateInput: (date: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  isSubmitting: boolean;
  handleAddEvent: () => void;
}

export default function AddEventDialog({
  visible,
  onDismiss,
  editingEvent,
  selectedPersonIds,
  togglePersonId,
  people,
  eventType,
  setEventType,
  eventTypes,
  dateInput,
  setDateInput,
  notes,
  setNotes,
  isSubmitting,
  handleAddEvent,
}: AddEventDialogProps) {
  const { t } = useTranslation();
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>
          {editingEvent ? t('timeline.editTitle') : t('timeline.addTitle')}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="titleSmall" style={[styles.dialogLabel, styles.dialogFont]}>
            {t('timeline.people')}
          </Text>
          <View style={styles.personList}>
            {people.map((person) => (
              <Chip
                key={person.id}
                selected={selectedPersonIds.includes(person.id)}
                showSelectedOverlay
                onPress={() => togglePersonId(person.id)}
                style={styles.personChip}
                textStyle={styles.dialogFont}
              >
                {person.name}
              </Chip>
            ))}
          </View>

          <Text variant="titleSmall" style={[styles.dialogLabel, styles.dialogFont]}>
            {t('timeline.eventType')}
          </Text>
          <SegmentedButtons
            value={eventType}
            onValueChange={setEventType}
            buttons={eventTypes.slice(0, 3)}
            style={styles.segmented}
          />
          <SegmentedButtons
            value={eventType}
            onValueChange={setEventType}
            buttons={eventTypes.slice(3, 6)} // Adjusted slice to show more options if needed or split differently
            style={styles.segmented}
          />
          <SegmentedButtons
            value={eventType}
            onValueChange={setEventType}
            buttons={eventTypes.slice(6)}
            style={styles.segmented}
          />

          <Text variant="titleSmall" style={[styles.dialogLabel, styles.dialogFont]}>
            {t('timeline.eventDate')}
          </Text>
          <TextInput
            mode="outlined"
            label={t('timeline.date')}
            placeholder={t('timeline.datePlaceholder')}
            value={dateInput}
            onChangeText={setDateInput}
            style={[styles.dateInput, styles.dialogFont]}
          />

          <TextInput
            mode="outlined"
            label={t('timeline.notesLabel')}
            placeholder={t('timeline.notesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={[styles.notesInput, styles.dialogFont]}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button labelStyle={styles.dialogFont} onPress={onDismiss}>
            {t('common.cancel')}
          </Button>
          <Button
            labelStyle={styles.dialogFont}
            onPress={handleAddEvent}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {editingEvent ? t('timeline.save') : t('timeline.add')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
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
  dialogLabel: {
    marginBottom: 8,
    marginTop: 12,
  },
  personList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  personChip: {
    marginBottom: 4,
    borderRadius: fz.rPill,
  },
  segmented: {
    marginBottom: 8,
  },
  dateInput: {
    marginBottom: 12,
  },
  notesInput: {
    marginBottom: 4,
  },
});
