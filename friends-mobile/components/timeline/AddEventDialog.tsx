import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Dialog, Portal, Text, Chip, SegmentedButtons, TextInput, Button } from 'react-native-paper';

interface AddEventDialogProps {
    visible: boolean;
    onDismiss: () => void;
    editingEvent: any;
    selectedPersonId: string | null;
    setSelectedPersonId: (id: string | null) => void;
    people: any[];
    getPersonName: (id: string) => string;
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
    selectedPersonId,
    setSelectedPersonId,
    people,
    getPersonName,
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
            <Dialog visible={visible} onDismiss={onDismiss}>
                <Dialog.Title>{editingEvent ? 'Edit Timeline Event' : 'Add Timeline Event'}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="titleSmall" style={styles.dialogLabel}>
                        Person
                    </Text>
                    {selectedPersonId ? (
                        <View style={styles.selectedPerson}>
                            <Chip onClose={() => setSelectedPersonId(null)}>
                                {getPersonName(selectedPersonId)}
                            </Chip>
                        </View>
                    ) : (
                        <View style={styles.personList}>
                            {people.slice(0, 5).map((person) => (
                                <Chip
                                    key={person.id}
                                    onPress={() => setSelectedPersonId(person.id)}
                                    style={styles.personChip}
                                >
                                    {person.name}
                                </Chip>
                            ))}
                            {people.length > 5 && (
                                <Text variant="labelSmall" style={styles.moreText}>
                                    + {people.length - 5} more
                                </Text>
                            )}
                        </View>
                    )}

                    <Text variant="titleSmall" style={styles.dialogLabel}>
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

                    <Text variant="titleSmall" style={styles.dialogLabel}>
                        Event Date (YYYY, YYYY-MM, or YYYY-MM-DD)
                    </Text>
                    <TextInput
                        mode="outlined"
                        label="Date"
                        placeholder="2024 or 2024-03 or 2024-03-15"
                        value={dateInput}
                        onChangeText={setDateInput}
                        style={styles.dateInput}
                    />

                    <TextInput
                        mode="outlined"
                        label="Notes (optional)"
                        placeholder="What happened?"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                        style={styles.notesInput}
                    />
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss}>Cancel</Button>
                    <Button onPress={handleAddEvent} loading={isSubmitting} disabled={isSubmitting}>
                        {editingEvent ? 'Save' : 'Add'}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}

const styles = StyleSheet.create({
    dialogLabel: {
        marginBottom: 8,
        marginTop: 12,
    },
    selectedPerson: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    personList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    personChip: {
        marginBottom: 4,
    },
    moreText: {
        alignSelf: 'center',
        opacity: 0.6,
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
