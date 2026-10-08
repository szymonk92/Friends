import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, FlatList, useWindowDimensions } from 'react-native';
import { Portal, Searchbar, Checkbox, Button, Text } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { relationshipTypeLabel } from '@/lib/i18n/labels';
import { PersonRow } from '@/components/PersonRow';
import { usePeople, type PersonWithPhoto } from '@/hooks/usePeople';
import { fz } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';

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
  title,
}: PersonSelectorProps) {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
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

  const renderItem = ({ item }: { item: PersonWithPhoto }) => (
    <PersonRow
      name={item.name}
      photoPath={item.photoPath}
      subtitle={relationshipTypeLabel(item.relationshipType || 'acquaintance')}
      avatarSize={40}
      avatarVariant="ink"
      onPress={() => toggleSelection(item.id)}
      right={
        <Checkbox
          status={selectedIds.has(item.id) ? 'checked' : 'unchecked'}
          onPress={() => toggleSelection(item.id)}
        />
      }
      style={styles.listItem}
    />
  );

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={[styles.dialog, styles.dialogShape]}>
        <Dialog.Title style={styles.dialogTitle}>{title ?? t('personSelector.title')}</Dialog.Title>
        {/* Short enough that the whole dialog fits above the iOS keyboard while searching. */}
        <Dialog.Content
          style={[styles.content, { height: Math.min(400, Math.round(windowHeight * 0.4)) }]}
        >
          <Searchbar
            placeholder={t('comparePicker.search')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.dialogFont}
            elevation={0}
          />

          <View style={styles.listContainer}>
            {isLoading ? (
              <Text style={[styles.loadingText, styles.dialogFont]}>{t('personSelector.loading')}</Text>
            ) : filteredPeople.length === 0 ? (
              <Text style={[styles.emptyText, styles.dialogFont]}>{t('personSelector.none')}</Text>
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
          <Button labelStyle={styles.dialogFont} onPress={onDismiss}>
            {t('common.cancel')}
          </Button>
          <Button
            labelStyle={styles.dialogFont}
            onPress={handleSave}
            mode="contained"
            style={styles.saveButton}
          >
            {t('personSelector.done', { count: selectedIds.size })}
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
  dialogShape: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  dialogTitle: {
    fontFamily: fz.font,
  },
  dialogFont: {
    fontFamily: fz.font,
  },
  content: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: fz.surfaceSoft,
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
