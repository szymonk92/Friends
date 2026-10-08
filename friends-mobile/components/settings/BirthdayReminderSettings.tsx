import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, List, Switch, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { type BirthdayReminderSettings } from '@/lib/notifications/birthday-reminders';
import type { Person } from '@/lib/db/schema';
import { useTranslation } from 'react-i18next';

interface UpcomingBirthday {
  person: Person;
  daysUntil: number;
  nextBirthday: Date;
  age: number;
}

interface BirthdayReminderSettingsProps {
  birthdaySettings: BirthdayReminderSettings | null;
  savingBirthdaySettings: boolean;
  handleBirthdaySettingChange: <K extends keyof BirthdayReminderSettings>(
    key: K,
    value: BirthdayReminderSettings[K]
  ) => void;
  upcomingBirthdays: UpcomingBirthday[];
}

export default function BirthdayReminderSettings({
  birthdaySettings,
  savingBirthdaySettings,
  handleBirthdaySettingChange,
  upcomingBirthdays,
}: BirthdayReminderSettingsProps) {
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          {t('birthdayReminders.title')}
        </Text>
        <Divider style={styles.divider} />

        {birthdaySettings && (
          <>
            <List.Item
              title={t('birthdayReminders.enable')}
              description={t('birthdayReminders.enableDesc')}
              left={(props) => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={birthdaySettings.enabled}
                  onValueChange={(value) => handleBirthdaySettingChange('enabled', value)}
                  disabled={savingBirthdaySettings}
                />
              )}
            />

            {birthdaySettings.enabled && (
              <>
                <List.Item
                  title={t('birthdayReminders.onDay')}
                  description={t('birthdayReminders.onDayDesc')}
                  left={(props) => <List.Icon {...props} icon="cake-variant" />}
                  right={() => (
                    <Switch
                      value={birthdaySettings.remindOnDay}
                      onValueChange={(value) => handleBirthdaySettingChange('remindOnDay', value)}
                    />
                  )}
                />

                <View style={styles.settingRow}>
                  <Text variant="bodyMedium">{t('birthdayReminders.daysBefore')}</Text>
                  <SegmentedButtons
                    value={String(birthdaySettings.daysBefore)}
                    onValueChange={(value) =>
                      handleBirthdaySettingChange('daysBefore', parseInt(value))
                    }
                    buttons={[
                      { value: '0', label: t('birthdayReminders.none') },
                      { value: '1', label: '1' },
                      { value: '3', label: '3' },
                      { value: '7', label: '7' },
                    ]}
                    style={styles.segmentedButtons}
                  />
                </View>

                <List.Item
                  title={t('birthdayReminders.onlyImportant')}
                  description={t('birthdayReminders.onlyImportantDesc')}
                  left={(props) => <List.Icon {...props} icon="star" />}
                  right={() => (
                    <Switch
                      value={birthdaySettings.onlyImportantPeople}
                      onValueChange={(value) =>
                        handleBirthdaySettingChange('onlyImportantPeople', value)
                      }
                    />
                  )}
                />

                {birthdaySettings.onlyImportantPeople && (
                  <View style={styles.settingRow}>
                    <Text variant="bodyMedium">{t('birthdayReminders.minImportance')}</Text>
                    <SegmentedButtons
                      value={birthdaySettings.importanceThreshold}
                      onValueChange={(value) =>
                        handleBirthdaySettingChange('importanceThreshold', value)
                      }
                      buttons={[
                        { value: 'important', label: t('birthdayReminders.important') },
                        { value: 'very_important', label: t('birthdayReminders.very') },
                        { value: 'critical', label: t('birthdayReminders.critical') },
                      ]}
                      style={styles.segmentedButtons}
                    />
                  </View>
                )}
              </>
            )}

            {upcomingBirthdays.length > 0 && (
              <View style={styles.upcomingContainer}>
                <Text variant="titleSmall" style={styles.upcomingTitle}>
                  {t('birthdayReminders.upcoming')}
                </Text>
                {upcomingBirthdays.slice(0, 5).map((item) => (
                  <List.Item
                    key={item.person.id}
                    title={item.person.name}
                    description={t('birthdayReminders.inDays', { days: item.daysUntil, age: item.age })}
                    left={(props) => <List.Icon {...props} icon="cake" />}
                    onPress={() => router.push(`/person/${item.person.id}`)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  settingRow: {
    marginTop: 16,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  upcomingContainer: {
    marginTop: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
  },
  upcomingTitle: {
    marginBottom: 8,
    marginLeft: 8,
    marginTop: 8,
  },
});
