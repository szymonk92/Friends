import { StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateRelation, useUpdateRelation } from '@/hooks/useRelations';
import { devLogger } from '@/lib/utils/devLogger';
import { usePerson } from '@/hooks/usePeople';
import { useEntityById } from '@/hooks/useEntityById';
import { relations, type Relation } from '@/lib/db/schema';
import {
  RELATION_TYPE_OPTIONS,
  INTENSITY_OPTIONS,
  STATUS_OPTIONS,
  TYPES_WITHOUT_INTENSITY,
} from '@/lib/constants/relations';
import { fz, fzText } from '@/lib/design/tokens';
import { relationTypeLabel, relationStatusLabel, intensityLabel } from '@/lib/i18n/labels';
import { PillGroup } from '@/components/PillGroup';
import { FormSection, FormInput, FormScreen } from '@/components/FormKit';
import { useTranslation } from 'react-i18next';
import { fzAlert } from '@/lib/utils/confirm';

/** Route: /person/relation-form?personId=… (add) or ?relationId=… (edit). */
export default function RelationForm() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const mode = typeof params.relationId === 'string' ? 'edit' : 'add';
  const personId = mode === 'add' ? (params.personId as string) : undefined;
  const relationId = mode === 'edit' ? (params.relationId as string) : undefined;

  const createRelation = useCreateRelation();
  const updateRelation = useUpdateRelation();

  const { data: relation, isLoading, notFound } = useEntityById<Relation>(relations, relationId);
  const { data: displayPerson } = usePerson(
    (mode === 'add' ? personId : relation?.subjectId) ?? ''
  );

  const [relationType, setRelationType] = useState('LIKES');
  const [objectLabel, setObjectLabel] = useState('');
  const [category, setCategory] = useState('');
  const [intensity, setIntensity] = useState<string>('medium');
  const [status, setStatus] = useState<string>('current');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hydrate form state once the relation loads (edit mode).
  useEffect(() => {
    if (!relation) return;
    setRelationType(relation.relationType);
    setObjectLabel(relation.objectLabel);
    setCategory(relation.category || '');
    setIntensity(relation.intensity || 'medium');
    setStatus(relation.status || 'current');
  }, [relation]);

  const handleSubmit = async () => {
    if (!objectLabel.trim()) {
      fzAlert(t('relationForm.missingTitle'), t('relationForm.missingMessage'));
      return;
    }

    setIsSubmitting(true);

    // HAS/LIVES_IN/KNOWS are binary facts — never persist a leftover
    // "medium" from local state just because the picker was hidden.
    const submittedIntensity = TYPES_WITHOUT_INTENSITY.includes(relationType)
      ? null
      : (intensity as any);

    try {
      if (mode === 'add') {
        await createRelation.mutateAsync({
          subjectId: personId!,
          subjectType: 'person',
          relationType: relationType as any,
          objectLabel: objectLabel.trim(),
          objectType: category.trim() || undefined,
          category: category.trim() || undefined,
          intensity: submittedIntensity,
          confidence: 1.0, // Manual entry = 100% confident
          source: 'manual',
          status: status as any,
        });

        router.back();
      } else {
        await updateRelation.mutateAsync({
          id: relationId!,
          relationType: relationType as any,
          objectLabel: objectLabel.trim(),
          category: category.trim() || null,
          intensity: submittedIntensity,
          status: status as any,
        });

        router.back();
      }
    } catch (error) {
      // Add mode may throw a typed contradiction from the hook; surface it.
      // Edit mode keeps the generic message (the guard isn't on the update path).
      const msg =
        mode === 'add' && error instanceof Error
          ? error.message
          : mode === 'add'
            ? t('relationForm.addFailed')
            : t('relationForm.updateFailed');
      fzAlert(mode === 'add' ? t('relationForm.cannotAdd') : t('common.error'), msg);
      devLogger.error(`Failed to ${mode} relation`, { error, relationType, personId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlaceholder = () => {
    switch (relationType) {
      case 'LIKES':
      case 'DISLIKES':
      case 'AVOIDS':
      case 'IS':
      case 'HAS':
      case 'LIVES_IN':
      case 'CAN':
      case 'DOES':
      case 'DID':
      case 'WANTS':
      case 'STRUGGLES_WITH':
      case 'KNOWS':
        return t(`relationForm.placeholder.${relationType}`);
      default:
        return t('relationForm.placeholder.default');
    }
  };

  return (
    <FormScreen
      title={displayPerson?.name || (mode === 'add' ? t('relationForm.addSomething') : t('common.edit'))}
      loading={isLoading}
      notFound={notFound}
      notFoundLabel={t('relationForm.notFound')}
    >
      <Text style={fzText.titleLg}>
        {t(mode === 'add' ? 'relationForm.addFor' : 'relationForm.editFor', {
          name: displayPerson?.name,
        })}
      </Text>
      <Text style={[fzText.sub, styles.headerSub]}>
        {mode === 'add'
          ? t('relationForm.addSubtitle')
          : t('relationForm.editSubtitle')}
      </Text>

      <FormSection title={t('relationForm.type')}>
        <PillGroup
          value={relationType}
          onChange={setRelationType}
          options={RELATION_TYPE_OPTIONS.map((o) => ({ ...o, label: relationTypeLabel(o.value, o.label) }))}
        />
      </FormSection>

      <FormSection>
        <FormInput
          label={t('relationForm.whatThey', {
            verb: relationTypeLabel(relationType).toLowerCase(),
          })}
          placeholder={getPlaceholder()}
          value={objectLabel}
          onChangeText={setObjectLabel}
          autoFocus
        />

        <FormInput
          label={t('relationForm.category')}
          placeholder={t('relationForm.categoryPlaceholder')}
          value={category}
          onChangeText={setCategory}
          style={styles.lastInput}
        />
      </FormSection>

      <FormSection title={t('relationForm.when')}>
        <PillGroup value={status} onChange={setStatus} options={STATUS_OPTIONS.map((o) => ({ ...o, label: relationStatusLabel(o.value, o.label) }))} />
      </FormSection>

      {!TYPES_WITHOUT_INTENSITY.includes(relationType) && (
        <FormSection title={t('relationForm.intensity')}>
          <PillGroup value={intensity} onChange={setIntensity} options={INTENSITY_OPTIONS.map((o) => ({ ...o, label: intensityLabel(o.value, o.label) }))} />
        </FormSection>
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting || !objectLabel.trim()}
        buttonColor={fz.ink}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        labelStyle={fzText.btn}
      >
        {mode === 'add' ? t('relationForm.add') : t('relationForm.save')}
      </Button>

      <Button
        mode="text"
        onPress={() => router.back()}
        disabled={isSubmitting}
        textColor={fz.textMute}
      >
        {t('common.cancel')}
      </Button>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  headerSub: {
    marginTop: 6,
    marginBottom: fz.s.lg,
  },
  lastInput: {
    marginBottom: 0,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: fz.rButton,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
