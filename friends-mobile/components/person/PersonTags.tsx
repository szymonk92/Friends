import { StyleSheet, View, Alert } from 'react-native';
import { Text, Chip, Button, Portal, Dialog, TextInput as PaperInput, useTheme } from 'react-native-paper';
import { useState } from 'react';
import { usePersonTags, useAddTagToPerson, useRemoveTagFromPerson, useAllTags } from '@/hooks/useTags';

interface PersonTagsProps {
    personId: string;
    personName: string;
}

export default function PersonTags({ personId, personName }: PersonTagsProps) {
    const theme = useTheme();
    const { data: personTags = [] } = usePersonTags(personId);
    const { data: allTags = [] } = useAllTags();
    const addTagToPerson = useAddTagToPerson();
    const removeTagFromPerson = useRemoveTagFromPerson();

    const [addTagDialogVisible, setAddTagDialogVisible] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [isAddingTag, setIsAddingTag] = useState(false);

    // Filter out tags that are already assigned to this person
    const availableTags = allTags.filter((tag) => !personTags.includes(tag));

    const handleAddTag = async () => {
        if (!newTagName.trim()) {
            Alert.alert('Error', 'Please enter a tag name');
            return;
        }

        setIsAddingTag(true);
        try {
            await addTagToPerson.mutateAsync({ personId, tag: newTagName.trim() });
            setAddTagDialogVisible(false);
            setNewTagName('');
        } catch (error) {
            Alert.alert('Error', 'Failed to add tag');
        } finally {
            setIsAddingTag(false);
        }
    };

    const handleRemoveTag = (tag: string) => {
        Alert.alert('Remove Tag', `Remove "${tag}" from ${personName}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: () => removeTagFromPerson.mutateAsync({ personId, tag }),
            },
        ]);
    };

    return (
        <>
            <View style={[styles.section, { borderBottomColor: theme.colors.surfaceVariant }]}>
                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                        Tags
                    </Text>
                    <Button
                        mode="text"
                        compact
                        icon="tag-plus"
                        onPress={() => setAddTagDialogVisible(true)}
                    >
                        Add
                    </Button>
                </View>

                {personTags.length === 0 ? (
                    <Text variant="bodySmall" style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}>
                        No tags yet. Add tags to organize and filter contacts.
                    </Text>
                ) : (
                    <View style={styles.tagsContainer}>
                        {personTags.map((tag) => (
                            <Chip
                                key={tag}
                                icon="tag"
                                onClose={() => handleRemoveTag(tag)}
                                style={styles.tagChip}
                                mode="outlined"
                                compact
                            >
                                {tag}
                            </Chip>
                        ))}
                    </View>
                )}
            </View>

            <Portal>
                <Dialog visible={addTagDialogVisible} onDismiss={() => setAddTagDialogVisible(false)}>
                    <Dialog.Title>Add Tag</Dialog.Title>
                    <Dialog.Content>
                        <PaperInput
                            mode="outlined"
                            label="Tag Name"
                            placeholder="e.g., college, work, family"
                            value={newTagName}
                            onChangeText={setNewTagName}
                            style={{ marginBottom: 12 }}
                            autoCapitalize="none"
                        />

                        {availableTags.length > 0 && (
                            <>
                                <Text variant="labelMedium" style={{ marginBottom: 8 }}>
                                    Existing Tags
                                </Text>
                                <View style={styles.existingTagsContainer}>
                                    {availableTags.slice(0, 10).map((tag) => (
                                        <Chip
                                            key={tag}
                                            onPress={() => setNewTagName(tag)}
                                            style={styles.existingTagChip}
                                            mode="outlined"
                                            compact
                                        >
                                            {tag}
                                        </Chip>
                                    ))}
                                </View>
                            </>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setAddTagDialogVisible(false)}>Cancel</Button>
                        <Button onPress={handleAddTag} loading={isAddingTag} disabled={isAddingTag}>
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
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagChip: {
        marginBottom: 4,
    },
    existingTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    existingTagChip: {
        marginBottom: 4,
    },
});
