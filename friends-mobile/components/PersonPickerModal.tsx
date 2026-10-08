import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FullScreenModal } from '@/components/FullScreenModal';
import { PersonRow } from '@/components/PersonRow';
import { LineIcon } from '@/components/LineIcon';
import { fz, fzText } from '@/lib/design/tokens';
import { foldText } from '@/lib/utils/format';
import { relationshipTypeLabel } from '@/lib/i18n/labels';
import type { PersonWithPhoto } from '@/hooks/usePeople';

/**
 * Searchable, virtualized people picker (scales to hundreds of people).
 * `multi`: rows toggle and a Done button closes; otherwise tapping a row picks it and closes.
 */
export function PersonPickerModal({
  visible,
  onClose,
  title,
  people,
  selectedIds,
  onToggle,
  multi = false,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  people: PersonWithPhoto[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  multi?: boolean;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const close = () => {
    setQuery('');
    onClose();
  };

  const q = foldText(query.trim());
  const matches = q
    ? people.filter((p) => foldText(`${p.name} ${p.nickname ?? ''}`).includes(q))
    : people;

  return (
    <FullScreenModal
      visible={visible}
      onClose={close}
      title={title}
      right={
        multi && (
          <Pressable accessibilityRole="button" onPress={close} style={styles.done}>
            <Text style={fzText.btn}>{t('common.done')}</Text>
          </Pressable>
        )
      }
    >
      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <LineIcon name="search" size={16} color={fz.textMute} />
          <TextInput
            placeholder={t('comparePicker.search')}
            placeholderTextColor={fz.textMute}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            style={styles.searchText}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel={t('common.clear')}>
              <LineIcon name="close" size={14} color={fz.textMute} />
            </Pressable>
          )}
        </View>
      </View>
      <FlatList
        data={matches}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[fzText.sub, styles.empty]}>
            {t('comparePicker.noMatch', { query: query.trim() })}
          </Text>
        }
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          return (
            <PersonRow
              name={item.name}
              photoPath={item.photoPath}
              subtitle={item.relationshipType && relationshipTypeLabel(item.relationshipType)}
              divider
              onPress={() => {
                onToggle(item.id);
                if (!multi) close();
              }}
              right={
                <View style={[styles.check, selected && styles.checkOn]}>
                  {selected && <LineIcon name="check" size={14} color="#fff" />}
                </View>
              }
            />
          );
        }}
      />
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  done: {
    backgroundColor: fz.ink,
    borderRadius: fz.rButton,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  // Same pill search field as the Search tab.
  searchRow: { paddingHorizontal: fz.s.edge, paddingBottom: fz.s.md },
  searchInput: {
    height: 44,
    borderRadius: fz.rPill,
    backgroundColor: fz.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchText: { flex: 1, fontFamily: fz.font, fontSize: 15, color: fz.ink, padding: 0 },
  list: { paddingHorizontal: fz.s.edge, paddingBottom: 40 },
  empty: { textAlign: 'center', marginTop: 32 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: fz.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkOn: { backgroundColor: fz.ink, borderColor: fz.ink },
});
