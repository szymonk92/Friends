import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, FlatList } from 'react-native';
import { Portal, Dialog, Searchbar, List, Checkbox, Button, Text, Avatar, useTheme } from 'react-native-paper';
import { usePeople } from '@/hooks/usePeople';

interface PersonSelectorProps {
    visible: boolean;
    onDismiss: () => void;
    onSelect: (selectedIds: string[]) => void;
    initialSelectedIds?: string[];
    title?: string;
}

export default function PersonSelector({
    visible,
    onDismiss,
    onSelect,
    initialSelectedIds = [],
    title = 'Tag People',
}: PersonSelectorProps) {
    const theme = useTheme();
    const { data: people, isLoading } = usePeople();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));

    // Reset state when dialog opens
    useEffect(() => {
        if (visible) {
            setSelectedIds(new Set(initialSelectedIds));
            setSearchQuery('');
        }
    }, [visible, initialSelectedIds]);

    const filteredPeople = useMemo(() => {
        if (!people) return [];
        if (!searchQuery.trim()) return people;

        const query = searchQuery.toLowerCase();
        return people.filter((person) => person.name.toLowerCase().includes(query));
    }, [people, searchQuery]);

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSave = () => {
        onSelect(Array.from(selectedIds));
        onDismiss();
    };

    const renderItem = ({ item }: { item: any }) => {
        const isSelected = selectedIds.has(item.id);

        return (
            <List.Item
                title={item.name}
                description={item.relationshipType || 'Acquaintance'}
                left={(props) => (
                    <View style={styles.avatarContainer}>
                        {item.photoPath ? (
                            <Avatar.Image size={40} source={{ uri: item.photoPath }} />
                        ) : (
                            <Avatar.Text size={40} label={item.name.substring(0, 2).toUpperCase()} />
                        )}
                    </View>
                )}
                right={(props) => (
                    <Checkbox
                        status={isSelected ? 'checked' : 'unchecked'}
                        onPress={() => toggleSelection(item.id)}
                    />
                )}
                onPress={() => toggleSelection(item.id)}
                style={styles.listItem}
            />
        );
    };

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
                <Dialog.Title>{title}</Dialog.Title>
                <Dialog.Content style={styles.content}>
                    <Searchbar
                        placeholder="Search people..."
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={styles.searchBar}
                        elevation={0}
                    />

                    <View style={styles.listContainer}>
                        {isLoading ? (
                            <Text style={styles.loadingText}>Loading people...</Text>
                        ) : filteredPeople.length === 0 ? (
                            <Text style={styles.emptyText}>No people found</Text>
                        ) : (
                            <FlatList
                                data={filteredPeople}
                                renderItem={renderItem}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContent}
                            />
                        )}
                    </View>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss}>Cancel</Button>
                    <Button onPress={handleSave} mode="contained" style={styles.saveButton}>
                        Done ({selectedIds.size})
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}

const styles = StyleSheet.create({
    dialog: {
        maxHeight: '80%',
    },
    content: {
        paddingHorizontal: 0,
        paddingBottom: 0,
        height: 400, // Fixed height for scrolling
    },
    searchBar: {
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: '#f5f5f5',
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 16,
    },
    listItem: {
        paddingHorizontal: 16,
    },
    avatarContainer: {
        justifyContent: 'center',
        marginRight: 12,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 20,
        opacity: 0.6,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        opacity: 0.6,
    },
    saveButton: {
        marginHorizontal: 8,
    },
});
