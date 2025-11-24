import { StyleSheet, View, Alert } from 'react-native';
import { Text, Chip, Button, IconButton, Portal, Dialog, TextInput as PaperInput, useTheme } from 'react-native-paper';
import { useState } from 'react';
import { usePersonRelations, useDeleteRelation, useCreateRelation } from '@/hooks/useRelations';
import { useUpdatePerson } from '@/hooks/usePeople';
import { formatShortDate } from '@/lib/utils/format';
import { HAS_IMPORTANT_DATE } from '@/lib/constants/relations';

interface PersonImportantDatesProps {
    person: any;
}

export default function PersonImportantDates({ person }: PersonImportantDatesProps) {
    const theme = useTheme();
    const { data: personRelations } = usePersonRelations(person.id);
    const deleteRelation = useDeleteRelation();
    const createRelation = useCreateRelation();
    const updatePerson = useUpdatePerson();

    const [addDateDialogVisible, setAddDateDialogVisible] = useState(false);
    const [dateName, setDateName] = useState('');
    const [dateValue, setDateValue] = useState('');
    const [isAddingDate, setIsAddingDate] = useState(false);

    // Get important dates from relations
    const importantDates = personRelations?.filter((r) => r.relationType === HAS_IMPORTANT_DATE) || [];

    const parseFlexibleDate = (input: string): Date | null => {
        const trimmed = input.trim();
        const parts = trimmed.split('-').map((p) => parseInt(p, 10));

        if (parts.length === 1 && parts[0] >= 1900 && parts[0] <= 2100) {
            return new Date(parts[0], 0, 1);
        } else if (parts.length === 2 && parts[0] >= 1900 && parts[1] >= 1 && parts[1] <= 12) {
            return new Date(parts[0], parts[1] - 1, 1);
        } else if (parts.length === 3 && parts[0] >= 1900 && parts[1] >= 1 && parts[2] >= 1) {
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        return null;
    };

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

        // Check if this is a birthday
        const birthdayKeywords = ['birthday', 'b-day', 'bday', 'birth day', 'birth-day', 'dob', 'date of birth'];
        const isBirthday = birthdayKeywords.some((keyword) =>
            dateName.trim().toLowerCase().includes(keyword)
        );

        // Check if this is an anniversary
        const anniversaryKeywords = ['anniversary', 'wedding', 'married'];
        const isAnniversary = anniversaryKeywords.some((keyword) =>
            dateName.trim().toLowerCase().includes(keyword)
        );

        setIsAddingDate(true);
        try {
            if (isBirthday) {
                // Update the person's dateOfBirth field
                await updatePerson.mutateAsync({
                    id: person.id,
                    dateOfBirth: parsedDate,
                });
                setAddDateDialogVisible(false);
                setDateName('');
                setDateValue('');
                Alert.alert('Success', `Birthday set to ${formatShortDate(parsedDate)}!`);
            } else {
                // Add as regular important date (with special handling for anniversaries)
                await createRelation.mutateAsync({
                    subjectId: person.id,
                    relationType: 'HAS_IMPORTANT_DATE',
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

    return (
        <>
            <View style={[styles.section, { borderBottomColor: theme.colors.surfaceVariant }]}>
                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                        Important Dates
                    </Text>
                    <Button
                        mode="text"
                        compact
                        icon="plus"
                        onPress={() => setAddDateDialogVisible(true)}
                    >
                        Add
                    </Button>
                </View>

                {person.dateOfBirth && (
                    <View style={styles.importantDateItem}>
                        <Chip icon="cake-variant" compact style={styles.dateChip}>
                            Birthday
                        </Chip>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                            {formatShortDate(new Date(person.dateOfBirth))}
                        </Text>
                    </View>
                )}

                {importantDates.map((date) => (
                    <View key={date.id} style={styles.importantDateItem}>
                        <Chip icon="calendar-star" compact style={styles.dateChip}>
                            {date.objectLabel}
                        </Chip>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                            {date.validFrom ? formatShortDate(new Date(date.validFrom)) : 'No date'}
                        </Text>
                        <IconButton
                            icon="delete-outline"
                            size={18}
                            onPress={() => deleteRelation.mutateAsync(date.id)}
                        />
                    </View>
                ))}

                {!person.dateOfBirth && importantDates.length === 0 && (
                    <Text variant="bodySmall" style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}>
                        No important dates added yet
                    </Text>
                )}
            </View>

            <Portal>
                <Dialog visible={addDateDialogVisible} onDismiss={() => setAddDateDialogVisible(false)}>
                    <Dialog.Title>Add Important Date</Dialog.Title>
                    <Dialog.Content>
                        <PaperInput
                            mode="outlined"
                            label="Date Name"
                            placeholder="e.g., Wedding Anniversary, First Met"
                            value={dateName}
                            onChangeText={setDateName}
                            style={{ marginBottom: 16 }}
                        />
                        <PaperInput
                            mode="outlined"
                            label="Date"
                            placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
                            value={dateValue}
                            onChangeText={setDateValue}
                        />
                        <Text variant="labelSmall" style={{ opacity: 0.6, marginTop: 4 }}>
                            Enter year only (2020), year-month (2020-06), or full date (2020-06-15)
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setAddDateDialogVisible(false)}>Cancel</Button>
                        <Button onPress={handleAddImportantDate} loading={isAddingDate} disabled={isAddingDate}>
                            Add
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: '600',
        fontSize: 18,
    },
    importantDateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    dateChip: {
        marginRight: 8,
    },
    emptyStateText: {
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 12,
    },
});
