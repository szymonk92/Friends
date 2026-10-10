import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { useTranslation } from 'react-i18next';
import { usePeople } from '@/hooks/usePeople';
import { useCreateRelations, useDeleteRelation, useRelations } from '@/hooks/useRelations';
import { PersonPickerModal } from '@/components/PersonPickerModal';
import { FormSection } from '@/components/FormKit';
import {
  DIET_PRESETS,
  activeDietKeys,
  dietChanges,
  type DietKey,
} from '@/lib/constants/relations';
import { fz, fzText } from '@/lib/design/tokens';
import { fzAlert } from '@/lib/utils/confirm';

/**
 * Bulk diet backfill: pick a diet, tick everyone it applies to. Each tap saves
 * right away through the same canonical relations the edit-screen chips write.
 */
export default function DietChecklistScreen() {
  const { t } = useTranslation();
  const { data: people = [] } = usePeople();
  const { data: relations = [] } = useRelations();
  const createRelations = useCreateRelations();
  const deleteRelation = useDeleteRelation();
  const [openKey, setOpenKey] = useState<DietKey | null>(null);
  // Ignore repeat taps on a person while their write is in flight (avoids duplicates).
  const busy = useRef(new Set<string>());

  const rowsByPerson = useMemo(() => {
    const map = new Map<string, typeof relations>();
    for (const r of relations) {
      const list = map.get(r.subjectId);
      if (list) list.push(r);
      else map.set(r.subjectId, [r]);
    }
    return map;
  }, [relations]);

  const idsWith = (key: DietKey) =>
    people.filter((p) => activeDietKeys(rowsByPerson.get(p.id) ?? []).includes(key)).map((p) => p.id);

  const toggle = async (key: DietKey, personId: string) => {
    if (busy.current.has(personId)) return;
    busy.current.add(personId);
    try {
      const rows = rowsByPerson.get(personId) ?? [];
      const before = activeDietKeys(rows);
      const after = before.includes(key) ? before.filter((k) => k !== key) : [...before, key];
      const { toCreate, toDeleteIds } = dietChanges(before, after, rows);
      if (toCreate.length) {
        await createRelations.mutateAsync(
          toCreate.map((p) => ({
            subjectId: personId,
            subjectType: 'person',
            relationType: p.relationType,
            objectLabel: p.objectLabel,
            source: 'manual' as const,
            status: 'current' as const,
          }))
        );
      }
      await Promise.all(toDeleteIds.map((id) => deleteRelation.mutateAsync(id)));
    } catch (e) {
      fzAlert(t('common.error'), e instanceof Error ? e.message : t('common.unknownError'));
    } finally {
      busy.current.delete(personId);
    }
  };

  return (
    <>
      <AppBar title={t('dietChecklist.title')} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <FormSection hint={t('dietChecklist.hint')}>
          {DIET_PRESETS.map((p, i) => (
            <Pressable
              key={p.key}
              accessibilityRole="button"
              onPress={() => setOpenKey(p.key)}
              style={[styles.row, i < DIET_PRESETS.length - 1 && styles.divider]}
            >
              <Text style={fzText.name}>{t(`person.diet.${p.key}`)}</Text>
              <Text style={fzText.sub}>
                {t('dietChecklist.count', { count: idsWith(p.key).length })}
              </Text>
            </Pressable>
          ))}
        </FormSection>
      </ScrollView>
      <PersonPickerModal
        visible={openKey !== null}
        onClose={() => setOpenKey(null)}
        title={openKey ? t(`person.diet.${openKey}`) : ''}
        people={people}
        selectedIds={openKey ? idsWith(openKey) : []}
        onToggle={(id) => openKey && toggle(openKey, id)}
        multi
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  content: { padding: fz.s.edge },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: fz.hairline },
});
