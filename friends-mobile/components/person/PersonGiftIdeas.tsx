import { StyleSheet, View, Alert } from 'react-native';
import { Text, Chip, Button, IconButton, Portal, Dialog, TextInput as PaperInput, SegmentedButtons, useTheme } from 'react-native-paper';
import { useState } from 'react';
import { usePersonGiftIdeas, useCreateGiftIdea, useUpdateGiftIdea, useDeleteGiftIdea } from '@/hooks/useGifts';
import { formatShortDate } from '@/lib/utils/format';

interface PersonGiftIdeasProps {
    personId: string;
    personName: string;
}

export default function PersonGiftIdeas({ personId, personName }: PersonGiftIdeasProps) {
    const theme = useTheme();
    const { data: giftIdeas = [] } = usePersonGiftIdeas(personId);
    const createGiftIdea = useCreateGiftIdea();
    const updateGiftIdea = useUpdateGiftIdea();
    const deleteGiftIdea = useDeleteGiftIdea();

    const [addGiftDialogVisible, setAddGiftDialogVisible] = useState(false);
    const [giftItem, setGiftItem] = useState('');
    const [giftNotes, setGiftNotes] = useState('');
    const [giftPriority, setGiftPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [giftOccasion, setGiftOccasion] = useState('');
    const [isAddingGift, setIsAddingGift] = useState(false);

    const handleAddGiftIdea = async () => {
        if (!giftItem.trim()) {
            Alert.alert('Error', 'Please enter a gift idea');
            return;
        }

        setIsAddingGift(true);
        try {
            await createGiftIdea.mutateAsync({
                personId,
                item: giftItem.trim(),
                notes: giftNotes.trim() || undefined,
                priority: giftPriority,
                occasion: giftOccasion.trim() || undefined,
            });
            setAddGiftDialogVisible(false);
            setGiftItem('');
            setGiftNotes('');
            setGiftPriority('medium');
            setGiftOccasion('');
            Alert.alert('Success', 'Gift idea added!');
        } catch (error) {
            Alert.alert('Error', 'Failed to add gift idea');
        } finally {
            setIsAddingGift(false);
        }
    };

    const handleMarkGiftGiven = (giftId: string, item: string) => {
        Alert.alert('Mark as Given', `Mark "${item}" as given?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Given',
                onPress: () => updateGiftIdea.mutateAsync({ id: giftId, given: true }),
            },
        ]);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return '#d32f2f';
            case 'medium':
                return '#ff9800';
            case 'low':
                return '#4caf50';
            default:
                return '#757575';
        }
    };

    return (
        <>
            <View style={[styles.section, { borderBottomColor: theme.colors.surfaceVariant }]}>
                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                        Gift Ideas
                    </Text>
                    <Button
                        mode="text"
                        compact
                        icon="gift"
                        onPress={() => setAddGiftDialogVisible(true)}
                    >
                        Add
                    </Button>
                </View>

                {giftIdeas.length === 0 ? (
                    <Text variant="bodySmall" style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}>
                        No gift ideas yet. Add ideas for {personName}!
                    </Text>
                ) : (
                    giftIdeas.map((gift) => (
                        <View key={gift.id} style={[styles.giftItem, { backgroundColor: theme.colors.elevation.level1 }]}>
                            <View style={styles.giftInfo}>
                                <View style={styles.giftHeader}>
                                    <Text
                                        variant="bodyMedium"
                                        style={[
                                            styles.giftItemText,
                                            { color: theme.colors.onSurface },
                                            gift.status === 'given' && styles.giftGiven,
                                        ]}
                                    >
                                        {gift.item}
                                    </Text>
                                    <Chip
                                        compact
                                        style={[
                                            styles.priorityChip,
                                            { backgroundColor: getPriorityColor(gift.priority) + '20' },
                                        ]}
                                        textStyle={{ color: getPriorityColor(gift.priority), fontSize: 10 }}
                                    >
                                        {gift.priority}
                                    </Chip>
                                </View>
                                {gift.occasion && (
                                    <Text variant="labelSmall" style={[styles.giftOccasion, { color: theme.colors.onSurfaceVariant }]}>
                                        For: {gift.occasion}
                                    </Text>
                                )}
                                {gift.notes && (
                                    <Text variant="labelSmall" style={[styles.giftNotes, { color: theme.colors.onSurfaceVariant }]}>
                                        {gift.notes}
                                    </Text>
                                )}
                                {gift.status === 'given' && gift.givenDate && (
                                    <Text variant="labelSmall" style={styles.giftGivenDate}>
                                        Given on {formatShortDate(gift.givenDate)}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.giftActions}>
                                {gift.status !== 'given' && (
                                    <IconButton
                                        icon="check-circle-outline"
                                        size={20}
                                        iconColor="#4caf50"
                                        onPress={() => handleMarkGiftGiven(gift.id, gift.item)}
                                    />
                                )}
                                <IconButton
                                    icon="delete-outline"
                                    size={20}
                                    onPress={() => deleteGiftIdea.mutateAsync(gift.id)}
                                />
                            </View>
                        </View>
                    ))
                )}
            </View>

            <Portal>
                <Dialog visible={addGiftDialogVisible} onDismiss={() => setAddGiftDialogVisible(false)}>
                    <Dialog.Title>Add Gift Idea</Dialog.Title>
                    <Dialog.Content>
                        <PaperInput
                            mode="outlined"
                            label="Gift Item *"
                            placeholder="e.g., Hiking boots, Coffee machine"
                            value={giftItem}
                            onChangeText={setGiftItem}
                            style={{ marginBottom: 12 }}
                        />

                        <Text variant="labelMedium" style={{ marginBottom: 8 }}>
                            Priority
                        </Text>
                        <SegmentedButtons
                            value={giftPriority}
                            onValueChange={(v) => setGiftPriority(v as any)}
                            buttons={[
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                            ]}
                            style={{ marginBottom: 12 }}
                        />

                        <PaperInput
                            mode="outlined"
                            label="Occasion (optional)"
                            placeholder="e.g., Birthday, Christmas"
                            value={giftOccasion}
                            onChangeText={setGiftOccasion}
                            style={{ marginBottom: 12 }}
                        />

                        <PaperInput
                            mode="outlined"
                            label="Notes (optional)"
                            placeholder="Size, color, where to buy, etc."
                            value={giftNotes}
                            onChangeText={setGiftNotes}
                            multiline
                            numberOfLines={2}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setAddGiftDialogVisible(false)}>Cancel</Button>
                        <Button onPress={handleAddGiftIdea} loading={isAddingGift} disabled={isAddingGift}>
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
    emptyStateText: {
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 12,
    },
    giftItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        padding: 8,
        borderRadius: 8,
    },
    giftInfo: {
        flex: 1,
    },
    giftHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    giftItemText: {
        fontWeight: '500',
    },
    giftGiven: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    priorityChip: {
        height: 24,
    },
    giftOccasion: {
        marginBottom: 2,
    },
    giftNotes: {
        fontStyle: 'italic',
    },
    giftGivenDate: {
        color: '#4caf50',
        marginTop: 4,
    },
    giftActions: {
        flexDirection: 'row',
    },
});
