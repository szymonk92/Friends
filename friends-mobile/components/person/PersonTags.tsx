import { StyleSheet, View, Alert } from 'react-native';
import {
  Text,
  Button,
  Portal,
  Dialog,
  TextInput as PaperInput,
} from 'react-native-paper';
import { useState } from 'react';
import {
  usePersonTags,
  useAddTagToPerson,
  useRemoveTagFromPerson,
  useAllTags,
} from '@/hooks/useTags';
import { ProfileSection } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { fz, fzText } from '@/lib/design/tokens';

interface PersonTagsProps {
  personId: string;
  personName: string;
}

export default function PersonTags({ personId, personName }: PersonTagsProps) {
  const { data: personTags = [] } = usePersonTags(personId);
  const { data: allTags = [] } = useAllTags();
  const addTagToPerson = useAddTagToPerson();
  const removeTagFromPerson = useRemoveTagFromPerson();

  const [addTagDialogVisible, setAddTagDialogVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

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
      <ProfileSection label="Tags" count={personTags.length || null} onAdd={() => setAddTagDialogVisible(true)}>
        {personTags.length === 0 ? (
          <Text style={styles.empty}>No tags yet. Add tags to organize and filter contacts.</Text>
        ) : (
          <View style={styles.tagsContainer}>
            {personTags.map((tag) => (
              <Pill
                key={tag}
                label={tag}
                icon="tag"
                onClose={() => handleRemoveTag(tag)}
              />
            ))}
          </View>
        )}
      </ProfileSection>

      <Portal>
        <Dialog
          visible={addTagDialogVisible}
          onDismiss={() => setAddTagDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Add Tag</Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
              label="Tag Name"
              placeholder="e.g., college, work, family"
              value={newTagName}
              onChangeText={setNewTagName}
              style={[{ marginBottom: 12 }, styles.dialogFont]}
              autoCapitalize="none"
            />

            {availableTags.length > 0 && (
              <>
                <Text variant="labelMedium" style={[{ marginBottom: 8 }, styles.dialogFont]}>
                  Existing Tags
                </Text>
                <View style={styles.existingTagsContainer}>
                  {availableTags.slice(0, 10).map((tag) => (
                    <Pill key={tag} label={tag} onPress={() => setNewTagName(tag)} />
                  ))}
                </View>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={() => setAddTagDialogVisible(false)}>
              Cancel
            </Button>
            <Button
              labelStyle={styles.dialogFont}
              onPress={handleAddTag}
              loading={isAddingTag}
              disabled={isAddingTag}
            >
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  existingTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  empty: {
    ...fzText.sub,
    fontStyle: 'italic',
  },
  dialog: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  dialogTitle: {
    fontFamily: fz.font,
  },
  dialogFont: {
    fontFamily: fz.font,
  },
});