import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FullScreenModal } from '@/components/FullScreenModal';
import { PersonPickerModal } from '@/components/PersonPickerModal';
import { FormInput, FormSection } from '@/components/FormKit';
import { Pill } from '@/components/Pill';
import { PillGroup } from '@/components/PillGroup';
import { FlexibleDatePicker } from '@/components/FlexibleDatePicker';
import { fz, fzText } from '@/lib/design/tokens';
import type { PersonWithPhoto } from '@/hooks/usePeople';

interface AddEventDialogProps {
  visible: boolean;
  onDismiss: () => void;
  editingEvent: unknown;
  selectedPersonIds: string[];
  togglePersonId: (id: string) => void;
  people: PersonWithPhoto[];
  eventType: string;
  setEventType: (type: string) => void;
  eventTypes: { value: string; label: string }[];
  dateInput: string;
  setDateInput: (date: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  isSubmitting: boolean;
  handleAddEvent: () => void;
}

/** Full-screen add / edit timeline event form. */
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedPeople = people.filter((p) => selectedPersonIds.includes(p.id));

  return (
    <FullScreenModal
      visible={visible}
      onClose={onDismiss}
      title={editingEvent ? t('timeline.editTitle') : t('timeline.addTitle')}
      right={
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={handleAddEvent}
          style={styles.saveBtn}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={fzText.btn}>{editingEvent ? t('timeline.save') : t('timeline.add')}</Text>
          )}
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormSection title={t('timeline.people')}>
          <View style={styles.pillRow}>
            {selectedPeople.map((p) => (
              <Pill key={p.id} label={p.name} selected onClose={() => togglePersonId(p.id)} />
            ))}
            <Pill icon="plus" label={t('timeline.addPeople')} variant="outline" onPress={() => setPickerOpen(true)} />
          </View>
        </FormSection>

        <FormSection title={t('timeline.eventType')}>
          <PillGroup options={eventTypes} value={eventType} onChange={setEventType} />
        </FormSection>

        <FormSection title={t('timeline.date')}>
          <FlexibleDatePicker value={dateInput} onChange={setDateInput} />
        </FormSection>

        <FormSection title={t('timeline.notesLabel')}>
          <FormInput
            placeholder={t('timeline.notesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            style={[styles.lastInput, styles.notes]}
          />
        </FormSection>
      </ScrollView>

      <PersonPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('timeline.people')}
        people={people}
        selectedIds={selectedPersonIds}
        onToggle={togglePersonId}
        multi
      />
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  content: { padding: fz.s.edge, paddingTop: fz.s.xs },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saveBtn: {
    backgroundColor: fz.ink,
    borderRadius: fz.rButton,
    paddingVertical: 6,
    paddingHorizontal: 18,
    minWidth: 64,
    alignItems: 'center',
  },
  lastInput: { marginBottom: 0 },
  notes: { minHeight: 110 },
});
