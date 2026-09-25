import { StyleSheet, Alert } from 'react-native';
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
import { PillGroup } from '@/components/PillGroup';
import { FormSection, FormInput, FormScreen } from '@/components/FormKit';

type RelationFormMode = 'add' | 'edit';

interface RelationFormProps {
  mode: RelationFormMode;
}

export default function RelationForm({ mode }: RelationFormProps) {
  const params = useLocalSearchParams();
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
      Alert.alert('Missing Information', 'Please enter what they like/dislike/etc.');
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
          : `Failed to ${mode === 'add' ? 'add' : 'update'} relation. Please try again.`;
      Alert.alert(mode === 'add' ? 'Cannot add relation' : 'Error', msg);
      devLogger.error(`Failed to ${mode} relation`, { error, relationType, personId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlaceholder = () => {
    switch (relationType) {
      case 'LIKES':
        return 'e.g., coffee, hiking, classical music';
      case 'DISLIKES':
        return 'e.g., mushrooms, loud noises, crowds';
      case 'AVOIDS':
        return 'e.g., peanuts, alcohol, meat';
      case 'IS':
        return 'e.g., vegan, software engineer, introvert';
      case 'HAS':
        return 'e.g., glasses, a car, a house';
      case 'LIVES_IN':
        return 'e.g., Kraków, Brooklyn';
      case 'CAN':
        return 'e.g., programming, guitar, cooking';
      case 'DOES':
        return 'e.g., yoga, meditation, running';
      case 'DID':
        return 'e.g., ran a marathon, moved abroad';
      case 'WANTS':
        return 'e.g., learn piano, run a marathon';
      case 'STRUGGLES_WITH':
        return 'e.g., anxiety, procrastination, sleep';
      case 'KNOWS':
        return 'e.g., a lot of people in Berlin';
      default:
        return 'Enter details...';
    }
  };

  return (
    <FormScreen
      title={displayPerson?.name || (mode === 'add' ? 'Add Something' : 'Edit')}
      loading={isLoading}
      notFound={notFound}
      notFoundLabel="Relation not found"
    >
      <Text style={fzText.titleLg}>
        {mode === 'add' ? 'Add something they’re into' : 'Edit'} for {displayPerson?.name}
      </Text>
      <Text style={[fzText.sub, styles.headerSub]}>
        {mode === 'add'
          ? 'A like, dislike, fear, skill, or anything worth remembering.'
          : 'Update this entry.'}
      </Text>

      <FormSection title="Type">
        <PillGroup
          value={relationType}
          onChange={setRelationType}
          options={RELATION_TYPE_OPTIONS}
        />
      </FormSection>

      <FormSection>
        <FormInput
          label={`What they ${relationType.toLowerCase().replace('_', ' ')}`}
          placeholder={getPlaceholder()}
          value={objectLabel}
          onChangeText={setObjectLabel}
          autoFocus
        />

        <FormInput
          label="Category (optional)"
          placeholder="e.g., food, activity, music, sport"
          value={category}
          onChangeText={setCategory}
          style={styles.lastInput}
        />
      </FormSection>

      <FormSection title="When">
        <PillGroup value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </FormSection>

      {!TYPES_WITHOUT_INTENSITY.includes(relationType) && (
        <FormSection title="Intensity">
          <PillGroup value={intensity} onChange={setIntensity} options={INTENSITY_OPTIONS} />
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
        {mode === 'add' ? 'Add' : 'Save Changes'}
      </Button>

      <Button
        mode="text"
        onPress={() => router.back()}
        disabled={isSubmitting}
        textColor={fz.textMute}
      >
        Cancel
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
