import { StyleSheet, View, Pressable } from 'react-native';
import { displayObjectLabel } from '@/lib/constants/relations';
import { Text, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersonRelations, useDeleteRelation } from '@/hooks/useRelations';
import { ActionSheet } from '@/components/ActionSheet';
import { confirmDestructive } from '@/lib/utils/confirm';
import { intensityLabel } from '@/lib/i18n/labels';
import { formatRelationType } from '@/lib/utils/format';
import { WEAK, MEDIUM, STRONG, TYPES_WITHOUT_INTENSITY } from '@/lib/constants/relations';
import { ProfileSection, chipRow } from './ProfileSection';
import { Pill } from '@/components/Pill';
import { RelationIcon } from '@/components/RelationIcon';
import { fz, fzText } from '@/lib/design/tokens';

// Priority order for relation types (higher priority = shown first)
const RELATION_TYPE_PRIORITY: Record<string, number> = {
  STRUGGLES_WITH: 100,
  AVOIDS: 95,
  WANTS: 90,
  LIVES_IN: 85,
  IS: 80,
  CAN: 75,
  DOES: 70,
  KNOWS: 65,
  LIKES: 60,
  HAS: 55,
  DID: 50,
  DISLIKES: 45,
  HAS_IMPORTANT_DATE: 40,
};

interface PersonRelationsProps {
  personId: string;
  personName: string;
}

export default function PersonRelations({ personId, personName }: PersonRelationsProps) {
  const { t } = useTranslation();
  const { data: personRelations, isLoading: relationsLoading } = usePersonRelations(personId);
  const deleteRelation = useDeleteRelation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const relationsByType = personRelations?.reduce(
    (acc, relation) => {
      const type = relation.relationType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(relation);
      return acc;
    },
    {} as Record<string, typeof personRelations>
  );

  const sortedRelationTypes = relationsByType
    ? Object.keys(relationsByType).sort(
        (a, b) => (RELATION_TYPE_PRIORITY[b] || 0) - (RELATION_TYPE_PRIORITY[a] || 0)
      )
    : [];

  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const toggleType = (type: string) =>
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));

  const selected = personRelations?.find((r) => r.id === selectedId) ?? null;
  const handleDelete = (r: { id: string; objectLabel: string }) =>
    confirmDestructive({
      title: t('manageRelations.deleteTitle'),
      message: t('manageRelations.deleteMessage', { item: r.objectLabel }),
      onConfirm: () => deleteRelation.mutateAsync(r.id),
    });

  return (
    <>
      <ProfileSection
        label={t('profile.intoTitle')}
        count={personRelations?.length || 0}
        onAdd={() => router.push(`/person/add-relation?personId=${personId}`)}
        empty={
          !relationsLoading &&
          personRelations?.length === 0 &&
          t('profile.intoEmpty', { name: personName })
        }
      >
        {relationsLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={fz.ink} />
          </View>
        )}

        <View style={styles.groups}>
          {sortedRelationTypes.map((type) => {
            const rels = relationsByType![type];
            const expanded = expandedTypes[type] ?? true;
            return (
              <View key={type}>
                <Pressable
                  style={styles.relationTypeHeader}
                  onPress={() => toggleType(type)}
                  hitSlop={8}
                >
                  <View style={styles.relationTypeLabelRow}>
                    <RelationIcon type={type} size={13} color={fz.ink} />
                    <Text style={fzText.label}>
                      {formatRelationType(type)} · {rels.length}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>{expanded ? '︿' : '﹀'}</Text>
                </Pressable>
                {expanded && (
                  <View style={[chipRow, styles.chipsTop]}>
                    {rels.map((relation) => {
                      const intensitySuffix =
                        relation.intensity &&
                        relation.intensity !== MEDIUM &&
                        !TYPES_WITHOUT_INTENSITY.includes(type)
                          ? relation.intensity === STRONG
                            ? ' +'
                            : relation.intensity === WEAK
                              ? ' −'
                              : ''
                          : '';
                      return (
                        <Pill
                          key={relation.id}
                          label={`${displayObjectLabel(relation.relationType, relation.objectLabel)}${intensitySuffix}`}
                          variant="surface"
                          onPress={() => setSelectedId(relation.id)}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ProfileSection>

      <ActionSheet
        visible={selected !== null}
        title={
          selected
            ? `${formatRelationType(selected.relationType)} · ${displayObjectLabel(selected.relationType, selected.objectLabel)}`
            : undefined
        }
        message={
          selected
            ? [
                selected.category,
                selected.intensity && !TYPES_WITHOUT_INTENSITY.includes(selected.relationType)
                  ? intensityLabel(selected.intensity, selected.intensity)
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : null
        }
        onDismiss={() => setSelectedId(null)}
        actions={
          selected
            ? [
                {
                  label: t('common.edit'),
                  icon: 'pencil',
                  onPress: () => router.push(`/person/edit-relation?relationId=${selected.id}`),
                },
                { label: t('common.delete'), icon: 'trash', onPress: () => handleDelete(selected) },
              ]
            : []
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { padding: 12, alignItems: 'center' },
  groups: { gap: fz.s.md },
  relationTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  relationTypeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevron: {
    ...fzText.sub,
    fontSize: 12,
  },
  chipsTop: { marginTop: fz.s.sm },
});
