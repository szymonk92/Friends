import { confirmDestructive, fzAlert } from '@/lib/utils/confirm';
import { StyleSheet, View } from 'react-native';
import { Text, Button, Portal, TextInput as PaperInput } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { useState } from 'react';
import { parseFlexibleDate } from '@/lib/utils/dates';
import { usePersonRelations, useDeleteRelation, useCreateRelation } from '@/hooks/useRelations';
import { useUpdatePerson } from '@/hooks/usePeople';
import { formatShortDate } from '@/lib/utils/format';
import { HAS_IMPORTANT_DATE } from '@/lib/constants/relations';
import type { Person } from '@/lib/db/schema';
import { ProfileSection } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { IconCircle } from '@/components/IconCircle';
import { fz, fzText } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

interface PersonImportantDatesProps {
  person: Person;
}

export default function PersonImportantDates({ person }: PersonImportantDatesProps) {
  const { t } = useTranslation();
  const { data: personRelations } = usePersonRelations(person.id);
  const deleteRelation = useDeleteRelation();
  const createRelation = useCreateRelation();
  const updatePerson = useUpdatePerson();

  const [addDateDialogVisible, setAddDateDialogVisible] = useState(false);
  const [dateName, setDateName] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [isAddingDate, setIsAddingDate] = useState(false);

  const importantDates =
    personRelations?.filter((r) => r.relationType === HAS_IMPORTANT_DATE) || [];

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

    setIsAddingDate(true);
    try {
      if (isBirthday) {
        await updatePerson.mutateAsync({ id: person.id, dateOfBirth: parsedDate });
        setAddDateDialogVisible(false);
        setDateName('');
        setDateValue('');
        fzAlert(
          t('common.success'),
          t('dates.birthdaySet', { date: formatShortDate(parsedDate) })
        );
      } else {
        await createRelation.mutateAsync({
          subjectId: person.id,
          relationType: HAS_IMPORTANT_DATE,
          objectLabel: isAnniversary
            ? t('dates.anniversaryLabel', { name: dateName.trim() })
            : dateName.trim(),
          validFrom: parsedDate,
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
            <View style={styles.dateItem}>
              <Pill label={t('dates.birthday')} icon="cake" variant="soft" />
              <Text style={styles.dateText}>{formatShortDate(new Date(person.dateOfBirth))}</Text>
            </View>
          )}

          {importantDates.map((date) => (
            <View key={date.id} style={styles.dateItem}>
              <Pill label={date.objectLabel} variant="soft" />
              <Text style={styles.dateText}>
                {date.validFrom ? formatShortDate(new Date(date.validFrom)) : t('dates.noDate')}
              </Text>
              <IconCircle
                icon="trash"
                size={28}
                iconSize={14}
                onPress={() =>
                  confirmDestructive({
                    title: t('dates.deleteTitle'),
                    message: t('dates.deleteMessage', { item: date.objectLabel }),
                    onConfirm: () => deleteRelation.mutateAsync(date.id),
                  })
                }
              />
            </View>
          ))}
        </View>
      </ProfileSection>

      <Portal>
        <Dialog
          visible={addDateDialogVisible}
          onDismiss={() => setAddDateDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t('dates.addTitle')}</Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
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
            <Button labelStyle={styles.dialogFont} onPress={() => setAddDateDialogVisible(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              labelStyle={styles.dialogFont}
              onPress={handleAddImportantDate}
              loading={isAddingDate}
              disabled={isAddingDate}
            >
              {t('dates.add')}
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
