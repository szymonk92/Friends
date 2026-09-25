import { StyleSheet, View, Alert } from 'react-native';
import {
  Text,
  Button,
  Portal,
  Dialog,
  TextInput as PaperInput,
} from 'react-native-paper';
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

interface PersonImportantDatesProps {
  person: Person;
}

export default function PersonImportantDates({ person }: PersonImportantDatesProps) {
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
      Alert.alert('Error', 'Please enter a name for this date');
      return;
    }
    const parsedDate = parseFlexibleDate(dateValue);
    if (!parsedDate) {
      Alert.alert('Invalid Date', 'Enter date as YYYY, YYYY-MM, or YYYY-MM-DD');
      return;
    }

    const birthdayKeywords = [
      'birthday', 'b-day', 'bday', 'birth day', 'birth-day', 'dob', 'date of birth',
    ];
    const isBirthday = birthdayKeywords.some((keyword) =>
      dateName.trim().toLowerCase().includes(keyword)
    );

    const anniversaryKeywords = ['anniversary', 'wedding', 'married'];
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
        Alert.alert('Success', `Birthday set to ${formatShortDate(parsedDate)}!`);
      } else {
        await createRelation.mutateAsync({
          subjectId: person.id,
          relationType: HAS_IMPORTANT_DATE,
          objectLabel: isAnniversary ? `Anniversary: ${dateName.trim()}` : dateName.trim(),
          validFrom: parsedDate,
          category: 'important_date',
          source: 'manual',
          intensity: 'strong',
          confidence: 1.0,
        });
        setAddDateDialogVisible(false);
        setDateName('');
        setDateValue('');
        Alert.alert('Success', `${dateName} added to important dates!`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add important date');
    } finally {
      setIsAddingDate(false);
    }
  };

  const count = (person.dateOfBirth ? 1 : 0) + importantDates.length;

  return (
    <>
      <ProfileSection label="Important Dates" count={count || null} onAdd={() => setAddDateDialogVisible(true)}>
        {person.dateOfBirth && (
          <View style={styles.dateItem}>
            <Pill label="Birthday" icon="cake" variant="soft" />
            <Text style={styles.dateText}>{formatShortDate(new Date(person.dateOfBirth))}</Text>
          </View>
        )}

        {importantDates.map((date) => (
          <View key={date.id} style={styles.dateItem}>
            <Pill label={date.objectLabel} variant="soft" />
            <Text style={styles.dateText}>
              {date.validFrom ? formatShortDate(new Date(date.validFrom)) : 'No date'}
            </Text>
            <IconCircle
              icon="trash"
              size={28}
              iconSize={14}
              onPress={() => deleteRelation.mutateAsync(date.id)}
            />
          </View>
        ))}

        {!person.dateOfBirth && importantDates.length === 0 && (
          <Text style={styles.empty}>No important dates added yet</Text>
        )}
      </ProfileSection>

      <Portal>
        <Dialog
          visible={addDateDialogVisible}
          onDismiss={() => setAddDateDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Add Important Date</Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
              label="Date Name"
              placeholder="e.g., Wedding Anniversary, First Met"
              value={dateName}
              onChangeText={setDateName}
              style={[{ marginBottom: 16 }, styles.dialogFont]}
            />
            <PaperInput
              mode="outlined"
              label="Date"
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              value={dateValue}
              onChangeText={setDateValue}
              style={styles.dialogFont}
            />
            <Text variant="labelSmall" style={[{ opacity: 0.6, marginTop: 4 }, styles.dialogFont]}>
              Enter year only (2020), year-month (2020-06), or full date (2020-06-15)
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={() => setAddDateDialogVisible(false)}>
              Cancel
            </Button>
            <Button
              labelStyle={styles.dialogFont}
              onPress={handleAddImportantDate}
              loading={isAddingDate}
              disabled={isAddingDate}
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
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dateText: {
    ...fzText.body,
    flex: 1,
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