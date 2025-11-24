import { StyleSheet, View, Alert } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { useCreateContactEvent } from '@/hooks/useContactEvents';
import { useCreateContactReminder } from '@/hooks/useReminders';

interface PersonQuickActionsProps {
    personId: string;
    personName: string;
}

export default function PersonQuickActions({ personId, personName }: PersonQuickActionsProps) {
    const theme = useTheme();
    const createContactEvent = useCreateContactEvent();
    const createContactReminder = useCreateContactReminder();

    const handleQuickAction = async (eventType: string, label: string) => {
        try {
            await createContactEvent.mutateAsync({
                personId,
                eventType: eventType as any,
                eventDate: new Date(),
                notes: `Quick logged: ${label}`,
            });
            Alert.alert('Logged!', `${label} with ${personName} recorded.`);
        } catch (error) {
            Alert.alert('Error', 'Failed to log event');
        }
    };

    const handleSetReminder = () => {
        Alert.alert(
            'Set Reminder',
            `Remind me to contact ${personName} in:`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: '1 Day',
                    onPress: () =>
                        createContactReminder
                            .mutateAsync({ personId, personName, daysFromNow: 1 })
                            .then(() => Alert.alert('Reminder Set', 'You will be reminded tomorrow at 10 AM')),
                },
                {
                    text: '1 Week',
                    onPress: () =>
                        createContactReminder
                            .mutateAsync({ personId, personName, daysFromNow: 7 })
                            .then(() => Alert.alert('Reminder Set', 'You will be reminded in 1 week')),
                },
                {
                    text: '1 Month',
                    onPress: () =>
                        createContactReminder
                            .mutateAsync({ personId, personName, daysFromNow: 30 })
                            .then(() => Alert.alert('Reminder Set', 'You will be reminded in 1 month')),
                },
            ]
        );
    };

    return (
        <View style={[styles.section, { borderBottomColor: theme.colors.surfaceVariant }]}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Quick Actions
            </Text>
            <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                One-tap logging for today
            </Text>
            <View style={styles.quickActionsRow}>
                <Chip
                    icon="account-check"
                    onPress={() => handleQuickAction('met', 'Met')}
                    style={styles.quickActionChip}
                    mode="outlined"
                    compact
                >
                    Met
                </Chip>
                <Chip
                    icon="phone"
                    onPress={() => handleQuickAction('called', 'Called')}
                    style={styles.quickActionChip}
                    mode="outlined"
                    compact
                >
                    Called
                </Chip>
                <Chip
                    icon="message"
                    onPress={() => handleQuickAction('messaged', 'Messaged')}
                    style={styles.quickActionChip}
                    mode="outlined"
                    compact
                >
                    Messaged
                </Chip>
            </View>
            <View style={styles.quickActionsRow}>
                <Chip
                    icon="coffee"
                    onPress={() => handleQuickAction('hung_out', 'Hung out')}
                    style={styles.quickActionChip}
                    mode="outlined"
                    compact
                >
                    Hung Out
                </Chip>
                <Chip
                    icon="star"
                    onPress={() => handleQuickAction('special', 'Special event')}
                    style={styles.quickActionChip}
                    mode="outlined"
                    compact
                >
                    Special
                </Chip>
                <Chip
                    icon="bell"
                    onPress={handleSetReminder}
                    style={styles.quickActionChip}
                    mode="outlined"
                    compact
                >
                    Remind
                </Chip>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    sectionTitle: {
        fontWeight: '600',
        fontSize: 18,
    },
    sectionSubtitle: {
        marginTop: 4,
        marginBottom: 12,
    },
    quickActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    quickActionChip: {
        marginRight: 4,
    },
});
