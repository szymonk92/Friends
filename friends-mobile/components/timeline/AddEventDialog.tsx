import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Dialog,
  Portal,
  Text,
  Chip,
  SegmentedButtons,
  TextInput,
  Button,
} from 'react-native-paper';
import { fz } from '@/lib/design/tokens';

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
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.dialogTitle}>
          {editingEvent ? 'Edit Timeline Event' : 'Add Timeline Event'}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="titleSmall" style={[styles.dialogLabel, styles.dialogFont]}>
            People
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
            Event Type
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
            Event Date (YYYY, YYYY-MM, or YYYY-MM-DD)
          </Text>
          <TextInput
            mode="outlined"
            label="Date"
            placeholder="2024 or 2024-03 or 2024-03-15"
            value={dateInput}
            onChangeText={setDateInput}
            style={[styles.dateInput, styles.dialogFont]}
          />

          <TextInput
            mode="outlined"
            label="Notes (optional)"
            placeholder="What happened?"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={[styles.notesInput, styles.dialogFont]}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button labelStyle={styles.dialogFont} onPress={onDismiss}>
            Cancel
          </Button>
          <Button
            labelStyle={styles.dialogFont}
            onPress={handleAddEvent}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {editingEvent ? 'Save' : 'Add'}
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
