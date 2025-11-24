import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, List, Switch, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { type BirthdayReminderSettings } from '@/lib/notifications/birthday-reminders';

interface BirthdayReminderSettingsProps {
    birthdaySettings: BirthdayReminderSettings | null;
    savingBirthdaySettings: boolean;
    handleBirthdaySettingChange: (key: keyof BirthdayReminderSettings, value: any) => void;
    upcomingBirthdays: any[];
}

export default function BirthdayReminderSettings({
    birthdaySettings,
    savingBirthdaySettings,
    handleBirthdaySettingChange,
    upcomingBirthdays,
}: BirthdayReminderSettingsProps) {
    return (
        <Card style={styles.card}>
            <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                    Birthday Reminders
                </Text>
                <Divider style={styles.divider} />

                {birthdaySettings && (
                    <>
                        <List.Item
                            title="Enable Reminders"
                            description="Get notified about upcoming birthdays"
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
                                    title="Remind on Birthday"
                                    description="Notify me on the actual birthday"
                                    left={(props) => <List.Icon {...props} icon="cake-variant" />}
                                    right={() => (
                                        <Switch
                                            value={birthdaySettings.remindOnDay}
                                            onValueChange={(value) => handleBirthdaySettingChange('remindOnDay', value)}
                                        />
                                    )}
                                />

                                <View style={styles.settingRow}>
                                    <Text variant="bodyMedium">Days before reminder:</Text>
                                    <SegmentedButtons
                                        value={String(birthdaySettings.daysBefore)}
                                        onValueChange={(value) => handleBirthdaySettingChange('daysBefore', parseInt(value))}
                                        buttons={[
                                            { value: '0', label: 'None' },
                                            { value: '1', label: '1' },
                                            { value: '3', label: '3' },
                                            { value: '7', label: '7' },
                                        ]}
                                        style={styles.segmentedButtons}
                                    />
                                </View>

                                <List.Item
                                    title="Only Important People"
                                    description="Only remind for important+ people"
                                    left={(props) => <List.Icon {...props} icon="star" />}
                                    right={() => (
                                        <Switch
                                            value={birthdaySettings.onlyImportantPeople}
                                            onValueChange={(value) => handleBirthdaySettingChange('onlyImportantPeople', value)}
                                        />
                                    )}
                                />

                                {birthdaySettings.onlyImportantPeople && (
                                    <View style={styles.settingRow}>
                                        <Text variant="bodyMedium">Minimum importance:</Text>
                                        <SegmentedButtons
                                            value={birthdaySettings.importanceThreshold}
                                            onValueChange={(value) => handleBirthdaySettingChange('importanceThreshold', value)}
                                            buttons={[
                                                { value: 'important', label: 'Important' },
                                                { value: 'very_important', label: 'Very' },
                                                { value: 'critical', label: 'Critical' },
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
                                    Upcoming Birthdays (30 days):
                                </Text>
                                {upcomingBirthdays.slice(0, 5).map((item) => (
                                    <List.Item
                                        key={item.person.id}
                                        title={item.person.name}
                                        description={`In ${item.daysUntil} days (turning ${item.age})`}
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
