import { confirmDestructive, fzAlert } from '@/lib/utils/confirm';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, Button, Portal, TextInput as PaperInput } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { useState } from 'react';
import {
  flexiblePrecision,
  metadataPrecision,
  parseFlexibleDate,
  toFlexibleText,
  type DatePrecision,
} from '@/lib/utils/dates';
import {
  addBirthdayToCalendar,
  scheduleBirthdayReminders,
} from '@/lib/notifications/birthday-reminders';
import { LineIcon } from '@/components/LineIcon';
import {
  usePersonRelations,
  useDeleteRelation,
  useCreateRelation,
  useUpdateRelation,
} from '@/hooks/useRelations';
import { useUpdatePerson } from '@/hooks/usePeople';
import { formatFlexibleDate } from '@/lib/utils/format';
import { HAS_IMPORTANT_DATE } from '@/lib/constants/relations';
import type { Person, Relation } from '@/lib/db/schema';
import { ActionSheet } from '@/components/ActionSheet';
import { ProfileSection } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { fz, fzText } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

// Important dates keep their precision in relation.metadata so "2019-06" never becomes June 1st.
const relationPrecision = (r: Relation) => metadataPrecision(r.metadata);
const precisionMetadata = (precision: DatePrecision | null) =>
  precision && precision !== 'day' ? JSON.stringify({ precision }) : null;

interface PersonImportantDatesProps {
  person: Person;
}

export default function PersonImportantDates({ person }: PersonImportantDatesProps) {
  const { t } = useTranslation();
  const { data: personRelations } = usePersonRelations(person.id);
  const deleteRelation = useDeleteRelation();
  const createRelation = useCreateRelation();
  const updatePerson = useUpdatePerson();
  const updateRelation = useUpdateRelation();

  // Row tapped → action sheet; 'birthday' is person.dateOfBirth, otherwise a relation.
  type DateTarget = 'birthday' | Relation;
  const [selected, setSelected] = useState<DateTarget | null>(null);
  const [editing, setEditing] = useState<DateTarget | null>(null);

  const [addDateDialogVisible, setAddDateDialogVisible] = useState(false);
  const [dateName, setDateName] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [isAddingDate, setIsAddingDate] = useState(false);

  const importantDates =
    personRelations?.filter((r) => r.relationType === HAS_IMPORTANT_DATE) || [];

  const closeDialog = () => {
    setAddDateDialogVisible(false);
    setEditing(null);
    setDateName('');
    setDateValue('');
  };

  const openEdit = (target: DateTarget) => {
    setEditing(target);
    if (target === 'birthday') {
      setDateName(t('dates.birthday'));
      setDateValue(
        person.dateOfBirth
          ? toFlexibleText(new Date(person.dateOfBirth), person.dateOfBirthPrecision)
          : ''
      );
    } else {
      setDateName(target.objectLabel);
      setDateValue(
        target.validFrom ? toFlexibleText(new Date(target.validFrom), relationPrecision(target)) : ''
      );
    }
    setAddDateDialogVisible(true);
  };

  const confirmDelete = (target: DateTarget) =>
    confirmDestructive({
      title: t('dates.deleteTitle'),
      message: t('dates.deleteMessage', {
        item: target === 'birthday' ? t('dates.birthday') : target.objectLabel,
      }),
      onConfirm: () =>
        target === 'birthday'
          ? updatePerson.mutateAsync({ id: person.id, dateOfBirth: null })
          : deleteRelation.mutateAsync(target.id),
    });

  const toggleReminder = async () => {
    try {
      await updatePerson.mutateAsync({ id: person.id, birthdayReminder: !person.birthdayReminder });
      await scheduleBirthdayReminders();
    } catch (error) {
      fzAlert(t('common.error'), t('settingsScreen.saveFailed'));
    }
  };

  const handleSaveEdit = async (target: DateTarget, parsedDate: Date) => {
    const precision = flexiblePrecision(dateValue);
    setIsAddingDate(true);
    try {
      if (target === 'birthday') {
        await updatePerson.mutateAsync({
          id: person.id,
          dateOfBirth: parsedDate,
          dateOfBirthPrecision: precision,
        });
        await scheduleBirthdayReminders();
      } else {
        await updateRelation.mutateAsync({
          id: target.id,
          objectLabel: dateName.trim(),
          validFrom: parsedDate,
          metadata: precisionMetadata(precision),
        });
      }
      closeDialog();
    } catch (error) {
      fzAlert(t('common.error'), t('dates.addFailed'));
    } finally {
      setIsAddingDate(false);
    }
  };

  const handleAddImportantDate = async () => {
    if (!dateName.trim()) {
      fzAlert(t('common.error'), t('dates.enterName'));
      return;
    }
    const parsedDate = parseFlexibleDate(dateValue);
    if (!parsedDate) {
      fzAlert(t('dates.invalidDate'), t('dates.invalidDateMessage'));
      return;
    }
    if (editing) {
      await handleSaveEdit(editing, parsedDate);
      return;
    }

    const birthdayKeywords = [
      'birthday',
      'b-day',
      'bday',
      'birth day',
      'birth-day',
      'dob',
      'date of birth',
      'urodziny',
      'data urodzenia',
    ];
    const isBirthday = birthdayKeywords.some((keyword) =>
      dateName.trim().toLowerCase().includes(keyword)
    );

    const anniversaryKeywords = ['anniversary', 'wedding', 'married', 'rocznica', 'ślub'];
    const isAnniversary = anniversaryKeywords.some((keyword) =>
      dateName.trim().toLowerCase().includes(keyword)
    );

    const precision = flexiblePrecision(dateValue);
    setIsAddingDate(true);
    try {
      if (isBirthday) {
        await updatePerson.mutateAsync({
          id: person.id,
          dateOfBirth: parsedDate,
          dateOfBirthPrecision: precision,
        });
        setAddDateDialogVisible(false);
        setDateName('');
        setDateValue('');
        fzAlert(
          t('common.success'),
          t('dates.birthdaySet', { date: formatFlexibleDate(parsedDate, precision) })
        );
      } else {
        await createRelation.mutateAsync({
          subjectId: person.id,
          relationType: HAS_IMPORTANT_DATE,
          objectLabel: isAnniversary
            ? t('dates.anniversaryLabel', { name: dateName.trim() })
            : dateName.trim(),
          validFrom: parsedDate,
          metadata: precisionMetadata(precision),
          category: 'important_date',
          source: 'manual',
          intensity: 'strong',
          confidence: 1.0,
        });
        setAddDateDialogVisible(false);
        setDateName('');
        setDateValue('');
        fzAlert(t('common.success'), t('dates.added', { name: dateName }));
      }
    } catch (error) {
      fzAlert(t('common.error'), t('dates.addFailed'));
    } finally {
      setIsAddingDate(false);
    }
  };

  const count = (person.dateOfBirth ? 1 : 0) + importantDates.length;
  // Reminders need a real day; month/year-only birthdays cannot be scheduled.
  const exactBirthday =
    !!person.dateOfBirth && (!person.dateOfBirthPrecision || person.dateOfBirthPrecision === 'day');

  return (
    <>
      <ProfileSection
        label={t('dates.title')}
        count={count || null}
        onAdd={() => setAddDateDialogVisible(true)}
        empty={count === 0 && t('dates.empty')}
      >
        <View style={styles.dates}>
          {person.dateOfBirth && (
            <Pressable
              style={styles.dateItem}
              onPress={() => setSelected('birthday')}
              accessibilityRole="button"
            >
              <Pill label={t('dates.birthday')} icon="cake" variant="soft" />
              <Text style={styles.dateText}>
                {formatFlexibleDate(new Date(person.dateOfBirth), person.dateOfBirthPrecision)}
              </Text>
              {exactBirthday && person.birthdayReminder && (
                <View style={styles.bellSlot}>
                  <LineIcon name="bell" size={16} color={fz.textMute} />
                </View>
              )}
            </Pressable>
          )}

          {importantDates.map((date) => (
            <Pressable
              key={date.id}
              style={styles.dateItem}
              onPress={() => setSelected(date)}
              accessibilityRole="button"
            >
              <Pill label={date.objectLabel} variant="soft" />
              <Text style={styles.dateText}>
                {date.validFrom
                  ? formatFlexibleDate(new Date(date.validFrom), relationPrecision(date))
                  : t('dates.noDate')}
              </Text>
            </Pressable>
          ))}
        </View>
      </ProfileSection>

      <ActionSheet
        visible={selected !== null}
        title={selected === 'birthday' ? t('dates.birthday') : selected?.objectLabel}
        actions={
          selected
            ? [
                ...(selected === 'birthday' && exactBirthday
                  ? [
                      {
                        label: person.birthdayReminder
                          ? t('dates.reminderOff')
                          : t('dates.reminderOn'),
                        icon: 'bell' as const,
                        onPress: toggleReminder,
                      },
                      {
                        label: t('dates.addToCalendar'),
                        icon: 'clock' as const,
                        onPress: () =>
                          addBirthdayToCalendar(
                            new Date(person.dateOfBirth!),
                            t('birthdayReminders.calendarTitle', { name: person.name })
                          ).catch(() =>
                            fzAlert(t('common.error'), t('birthdayReminders.calendarFailed'))
                          ),
                      },
                    ]
                  : []),
                { label: t('common.edit'), icon: 'pencil', onPress: () => openEdit(selected) },
                { label: t('common.delete'), icon: 'trash', onPress: () => confirmDelete(selected) },
              ]
            : []
        }
        onDismiss={() => setSelected(null)}
      />

      <Portal>
        <Dialog
          visible={addDateDialogVisible}
          onDismiss={closeDialog}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {editing ? t('dates.editTitle') : t('dates.addTitle')}
          </Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
              disabled={editing === 'birthday'}
              label={t('dates.nameLabel')}
              placeholder={t('dates.namePlaceholder')}
              value={dateName}
              onChangeText={setDateName}
              style={[{ marginBottom: 16 }, styles.dialogFont]}
            />
            <PaperInput
              mode="outlined"
              label={t('dates.dateLabel')}
              placeholder={t('dates.datePlaceholder')}
              value={dateValue}
              onChangeText={setDateValue}
              style={styles.dialogFont}
            />
            <Text variant="labelSmall" style={[{ opacity: 0.6, marginTop: 4 }, styles.dialogFont]}>
              {t('dates.hint')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={closeDialog}>
              {t('common.cancel')}
            </Button>
            <Button
              labelStyle={styles.dialogFont}
              onPress={handleAddImportantDate}
              loading={isAddingDate}
              disabled={isAddingDate}
            >
              {editing ? t('common.save') : t('dates.add')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dates: { gap: fz.s.sm },
  // Same 30px box as the section's + circle, so the bell centres under it.
  bellSlot: { width: 30, alignItems: 'center' },
  dateText: {
    ...fzText.body,
    flex: 1,
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
