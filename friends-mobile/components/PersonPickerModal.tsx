import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FullScreenModal } from '@/components/FullScreenModal';
import { PersonRow } from '@/components/PersonRow';
import { SearchField } from '@/components/SearchField';
import { LineIcon } from '@/components/LineIcon';
import { fz, fzText } from '@/lib/design/tokens';
import { foldText } from '@/lib/utils/format';
import { relationshipTypeLabel } from '@/lib/i18n/labels';
import type { PersonWithPhoto } from '@/hooks/usePeople';

/**
 * Searchable, virtualized people picker (scales to hundreds of people).
 * `multi`: rows toggle and a Done button closes; otherwise tapping a row picks it and closes.
 * `create`: while typing, shows an "Add <query>" row on top for someone not in the list.
 */
export function PersonPickerModal({
  visible,
  onClose,
  title,
  people,
  selectedIds,
  onToggle,
  multi = false,
  create,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  people: PersonWithPhoto[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  multi?: boolean;
  create?: {
    onCreate: (name: string) => void;
    label: (name: string) => string;
    hint?: string;
    placeholder?: string;
  };
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const close = () => {
    setQuery('');
    onClose();
  };

  const typed = query.trim();
  const q = foldText(typed);
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
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={create?.placeholder ?? t('comparePicker.search')}
        />
      </View>
      <FlatList
        data={matches}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          create && typed ? (
            <Pressable
              accessibilityRole="button"
              style={styles.createRow}
              onPress={() => {
                create.onCreate(typed);
                close();
              }}
            >
              <View style={styles.createIcon}>
                <LineIcon name="plus" size={16} color="#fff" />
              </View>
              <View style={styles.createBody}>
                <Text style={fzText.name}>{create.label(typed)}</Text>
                {create.hint && <Text style={fzText.sub}>{create.hint}</Text>}
              </View>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          create ? null : (
          <Text style={[fzText.sub, styles.empty]}>
            {t('comparePicker.noMatch', { query: typed })}
          </Text>
          )
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
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: fz.hairline,
  },
  createIcon: {
    // Same size as PersonRow's avatar so the list stays aligned.
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: fz.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBody: { flex: 1 },
});
