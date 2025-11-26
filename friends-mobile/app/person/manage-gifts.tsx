import { StyleSheet, View, Alert, ScrollView } from 'react-native';
import { Text, List, IconButton, Divider, ActivityIndicator, Button, Chip, useTheme } from 'react-native-paper';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePersonGiftIdeas, useDeleteGiftIdea } from '@/hooks/useGifts';
import { usePerson } from '@/hooks/usePeople';
import { formatShortDate } from '@/lib/utils/format';
import { spacing } from '@/styles/spacing';

export default function ManageGiftsScreen() {
    const { personId } = useLocalSearchParams<{ personId: string }>();
    const theme = useTheme();
    const { data: person } = usePerson(personId!);
    const { data: gifts = [], isLoading } = usePersonGiftIdeas(personId!);
    const deleteGift = useDeleteGiftIdea();

    const handleDelete = (giftId: string, item: string) => {
        Alert.alert('Delete Gift Idea', `Are you sure you want to delete "${item}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteGift.mutateAsync(giftId);
                },
            },
        ]);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return '#d32f2f';
            case 'medium':
                return (theme.colors as any).medium || '#ff9800';
            case 'low':
                return '#4caf50';
            default:
                return '#757575';
        }
    };

    if (isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: 'Manage Gifts' }} />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            </>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: `${person?.name || 'Person'} - Gifts`,
                    headerRight: () => (
                        <View style={{ marginRight: spacing.xs }}>
                            {/* We can add a plus button here if we want to allow adding from this screen too, 
                  but usually manage screens are for list management. 
                  Let's keep it simple for now or add it if needed. 
                  The user request said "manage them", implying list/delete/edit.
                  I'll add a plus button for consistency with relations.
              */}
                        </View>
                    ),
                }}
            />
            <ScrollView style={styles.container}>
                {gifts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text variant="bodyLarge" style={styles.emptyText}>
                            No gift ideas yet
                        </Text>
                    </View>
                ) : (
                    <View>
                        {/* We could group by status (given vs idea) or priority. 
                 For now, simple list. */}
                        {gifts.map((gift) => (
                            <View key={gift.id}>
                                <List.Item
                                    title={gift.item}
                                    titleStyle={gift.status === 'given' ? { textDecorationLine: 'line-through', opacity: 0.6 } : {}}
                                    description={
                                        <View style={styles.descriptionColumn}>
                                            <View style={styles.chipsRow}>
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
                                                {gift.occasion && (
                                                    <Chip compact style={styles.chip} textStyle={{ fontSize: 10 }}>
                                                        {gift.occasion}
                                                    </Chip>
                                                )}
                                            </View>
                                            {gift.notes && (
                                                <Text variant="bodySmall" style={styles.notesText} numberOfLines={2}>
                                                    {gift.notes}
                                                </Text>
                                            )}
                                            {gift.status === 'given' && gift.givenDate && (
                                                <Text variant="bodySmall" style={styles.givenDateText}>
                                                    Given: {formatShortDate(gift.givenDate)}
                                                </Text>
                                            )}
                                        </View>
                                    }
                                    right={() => (
                                        <View style={styles.actions}>
                                            <IconButton
                                                icon="delete-outline"
                                                size={20}
                                                iconColor={theme.colors.error}
                                                onPress={() => handleDelete(gift.id, gift.item)}
                                            />
                                        </View>
                                    )}
                                    style={styles.listItem}
                                />
                                <Divider />
                            </View>
                        ))}
                    </View>
                )}
                <View style={styles.spacer} />
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        marginBottom: 16,
        opacity: 0.7,
    },
    listItem: {
        backgroundColor: 'white',
        paddingVertical: 8,
    },
    descriptionColumn: {
        marginTop: 4,
        gap: 4,
    },
    chipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    priorityChip: {
        height: 24,
    },
    chip: {
        height: 24,
    },
    notesText: {
        opacity: 0.7,
        fontStyle: 'italic',
    },
    givenDateText: {
        color: '#4caf50',
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spacer: {
        height: 40,
    },
});
