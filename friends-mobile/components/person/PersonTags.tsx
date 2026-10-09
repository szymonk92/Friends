import { StyleSheet, View } from 'react-native';
import { confirmDestructive, fzAlert } from '@/lib/utils/confirm';
import { Text, Button, Portal, TextInput as PaperInput } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  usePersonTags,
  useAddTagToPerson,
  useRemoveTagFromPerson,
  useAllTags,
} from '@/hooks/useTags';
import { ProfileSection, chipRow } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { ActionSheet } from '@/components/ActionSheet';
import { fz } from '@/lib/design/tokens';

interface PersonTagsProps {
  personId: string;
  personName: string;
}

export default function PersonTags({ personId, personName }: PersonTagsProps) {
  const { t } = useTranslation();
  const { data: personTags = [] } = usePersonTags(personId);
  const { data: allTags = [] } = useAllTags();
  const addTagToPerson = useAddTagToPerson();
  const removeTagFromPerson = useRemoveTagFromPerson();

  const [addTagDialogVisible, setAddTagDialogVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const availableTags = allTags.filter((tag) => !personTags.includes(tag));

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      fzAlert(t('common.error'), t('profile.tagEnterName'));
      return;
    }

    setIsAddingTag(true);
    try {
      await addTagToPerson.mutateAsync({ personId, tag: newTagName.trim() });
      setAddTagDialogVisible(false);
      setNewTagName('');
    } catch (error) {
      fzAlert(t('common.error'), t('profile.tagAddFailed'));
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tag: string) => {
    confirmDestructive({
      title: t('profile.tagRemoveTitle'),
      message: t('profile.tagRemoveMessage', { tag, name: personName }),
      confirmLabel: t('profile.tagRemove'),
      onConfirm: () => removeTagFromPerson.mutateAsync({ personId, tag }),
    });
  };

  return (
    <>
      <ProfileSection
        label={t('profile.tagsTitle')}
        count={personTags.length || null}
        onAdd={() => setAddTagDialogVisible(true)}
        empty={personTags.length === 0 && t('profile.tagsEmpty')}
      >
        {personTags.length > 0 && (
          <View style={chipRow}>
            {personTags.map((tag) => (
              <Pill key={tag} label={tag} icon="tag" onPress={() => setSelectedTag(tag)} />
            ))}
          </View>
        )}
      </ProfileSection>

      <ActionSheet
        visible={selectedTag !== null}
        title={selectedTag ?? undefined}
        onDismiss={() => setSelectedTag(null)}
        actions={[
          {
            label: t('person.showPeopleWithTag'),
            icon: 'users',
            onPress: () =>
              selectedTag &&
              router.navigate({
                pathname: '/',
                params: { tag: selectedTag, at: String(Date.now()) },
              }),
          },
          {
            label: t('person.removeTag'),
            icon: 'trash',
            onPress: () => selectedTag && handleRemoveTag(selectedTag),
          },
        ]}
      />

      <Portal>
        <Dialog
          visible={addTagDialogVisible}
          onDismiss={() => setAddTagDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t('profile.tagAddTitle')}</Dialog.Title>
          <Dialog.Content>
            <PaperInput
              mode="outlined"
              label={t('profile.tagName')}
              placeholder={t('profile.tagPlaceholder')}
              value={newTagName}
              onChangeText={setNewTagName}
              style={[{ marginBottom: 12 }, styles.dialogFont]}
              autoCapitalize="none"
            />

            {availableTags.length > 0 && (
              <>
                <Text variant="labelMedium" style={[{ marginBottom: 8 }, styles.dialogFont]}>
                  {t('profile.tagExisting')}
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
              {t('common.cancel')}
            </Button>
            <Button
              labelStyle={styles.dialogFont}
              onPress={handleAddTag}
              loading={isAddingTag}
              disabled={isAddingTag}
            >
              {t('profile.tagAddButton')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  existingTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
