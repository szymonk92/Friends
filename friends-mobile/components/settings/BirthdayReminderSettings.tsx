import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconButton, Switch } from 'react-native-paper';
import { router } from 'expo-router';
import {
  addBirthdayToCalendar,
  scheduleBirthdayReminders,
  sortByNextBirthday,
  type BirthdayReminderSettings,
} from '@/lib/notifications/birthday-reminders';
import { usePeople, useUpdatePerson } from '@/hooks/usePeople';
import { fzAlert } from '@/lib/utils/confirm';
import { foldText, formatShortDate } from '@/lib/utils/format';
import { SearchField } from '@/components/SearchField';
import { useTranslation } from 'react-i18next';
import { FormSection } from '@/components/FormKit';
import { PillGroup } from '@/components/PillGroup';
import { fz, fzText } from '@/lib/design/tokens';

interface BirthdayReminderSettingsProps {
  birthdaySettings: BirthdayReminderSettings | null;
  savingBirthdaySettings: boolean;
  handleBirthdaySettingChange: <K extends keyof BirthdayReminderSettings>(
    key: K,
    value: BirthdayReminderSettings[K]
  ) => void;
}

export default function BirthdayReminderSettings({
  birthdaySettings,
  savingBirthdaySettings,
  handleBirthdaySettingChange,
}: BirthdayReminderSettingsProps) {
  const { t } = useTranslation();
  const { data: allPeople = [] } = usePeople({ entityType: 'all' });
  const updatePerson = useUpdatePerson();
  const [query, setQuery] = useState('');
  const birthdays = sortByNextBirthday(allPeople);
  const q = foldText(query.trim());
  const shown = q
    ? birthdays.filter(({ person }) => foldText(`${person.name} ${person.nickname ?? ''}`).includes(q))
    : birthdays;

  const toggleReminder = async (id: string, on: boolean) => {
    try {
      await updatePerson.mutateAsync({ id, birthdayReminder: on });
      await scheduleBirthdayReminders();
    } catch (error) {
      console.error('Birthday reminder toggle failed:', error);
      fzAlert(t('common.error'), t('settingsScreen.saveFailed'));
    }
  };

  const addToCalendar = async (name: string, dateOfBirth: Date) => {
    try {
      await addBirthdayToCalendar(dateOfBirth, t('birthdayReminders.calendarTitle', { name }));
    } catch (error) {
      console.error('Add birthday to calendar failed:', error);
      fzAlert(t('common.error'), t('birthdayReminders.calendarFailed'));
    }
  };

  if (!birthdaySettings) return null;
  return (
    <FormSection title={t('birthdayReminders.title')} hint={t('birthdayReminders.perPersonHint')}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={fzText.name}>{t('birthdayReminders.onDay')}</Text>
          <Text style={fzText.sub}>{t('birthdayReminders.onDayDesc')}</Text>
        </View>
        <Switch
          value={birthdaySettings.remindOnDay}
          onValueChange={(value) => handleBirthdaySettingChange('remindOnDay', value)}
          disabled={savingBirthdaySettings}
          color={fz.ink}
        />
      </View>

      <Text style={[fzText.name, styles.gap]}>{t('birthdayReminders.daysBefore')}</Text>
      <PillGroup
        style={styles.pills}
        value={String(birthdaySettings.daysBefore)}
        onChange={(value) => handleBirthdaySettingChange('daysBefore', parseInt(value, 10))}
        options={[
          { value: '0', label: t('birthdayReminders.none') },
          { value: '1', label: '1' },
          { value: '3', label: '3' },
          { value: '7', label: '7' },
        ]}
      />

      {birthdays.length > 0 && (
        <>
          <Text style={[fzText.label, styles.upcomingTitle]}>{t('birthdayReminders.people')}</Text>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('comparePicker.search')}
            style={styles.search}
          />
        </>
      )}
      {q && shown.length === 0 && (
        <Text style={[fzText.sub, styles.noMatch]}>{t('birthdayReminders.noMatch')}</Text>
      )}
      {shown.map(({ person, daysUntil, nextBirthday, age }) => (
        <View key={person.id} style={styles.row}>
          <Pressable
            style={styles.rowText}
            onPress={() => router.push(`/person/${person.id}`)}
            accessibilityRole="button"
          >
            <Text style={fzText.name} numberOfLines={1}>{person.name}</Text>
            <Text style={fzText.sub}>
              {formatShortDate(nextBirthday)} ·{' '}
              {daysUntil === 0
                ? t('birthdayReminders.today', { age })
                : t('birthdayReminders.inDays', { days: daysUntil, age })}
            </Text>
          </Pressable>
          <IconButton
            icon="calendar-plus"
            size={20}
            iconColor={fz.ink}
            style={styles.iconButton}
            accessibilityLabel={t('birthdayReminders.addToCalendar')}
            onPress={() => addToCalendar(person.name, person.dateOfBirth!)}
          />
          <Switch
            value={!!person.birthdayReminder}
            onValueChange={(on) => toggleReminder(person.id, on)}
            color={fz.ink}
            accessibilityLabel={t('dates.reminderOn')}
          />
        </View>
      ))}
    </FormSection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: fz.s.md,
    paddingVertical: fz.s.sm,
  },
  rowText: { flex: 1, gap: 2 },
  gap: { marginTop: fz.s.md },
  pills: { marginTop: fz.s.sm },
  upcomingTitle: { marginTop: fz.s.xl, marginBottom: fz.s.xs },
  iconButton: { margin: 0 },
  search: { marginTop: fz.s.sm, marginBottom: fz.s.xs },
  noMatch: { paddingVertical: fz.s.md, textAlign: 'center' },
});
