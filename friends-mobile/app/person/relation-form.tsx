import { StyleSheet, View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useCreateRelation, useUpdateRelation } from '@/hooks/useRelations';
import { devLogger } from '@/lib/utils/devLogger';
import { usePerson } from '@/hooks/usePeople';
import { db } from '@/lib/db';
import { relations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  RELATION_TYPE_OPTIONS,
  INTENSITY_OPTIONS,
  STATUS_OPTIONS,
  TYPES_WITHOUT_INTENSITY,
} from '@/lib/constants/relations';
import { fz, fzText } from '@/lib/design/tokens';
import { Pill } from '@/components/Pill';
import { FormSection, FormInput } from '@/components/FormKit';

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
  const { data: person } = usePerson(personId!);

  const [relation, setRelation] = useState<any>(null);
  const [loadedPerson, setLoadedPerson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(mode === 'edit');

  const [relationType, setRelationType] = useState('LIKES');
  const [objectLabel, setObjectLabel] = useState('');
  const [category, setCategory] = useState('');
  const [intensity, setIntensity] = useState<string>('medium');
  const [status, setStatus] = useState<string>('current');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load relation data for edit mode
  useEffect(() => {
    if (mode === 'edit' && relationId) {
      const loadRelation = async () => {
        try {
          const result = await db
            .select()
            .from(relations)
            .where(eq(relations.id, relationId))
            .limit(1);

          if (result.length > 0) {
            const rel = result[0];
            setRelation(rel);
            setRelationType(rel.relationType);
            setObjectLabel(rel.objectLabel);
            setCategory(rel.category || '');
            setIntensity(rel.intensity || 'medium');
            setStatus(rel.status || 'current');

            // Load person data
            const personData = await db.query.people.findFirst({
              where: (people: any, { eq }: any) => eq(people.id, rel.subjectId),
            });
            setLoadedPerson(personData);
          }
          setIsLoading(false);
        } catch (error) {
          devLogger.error('Failed to load relation for editing', { error, relationId });
          Alert.alert('Error', 'Failed to load relation');
          setIsLoading(false);
        }
      };

      loadRelation();
    }
  }, [mode, relationId]);

  // Get the person to display (from hook for add mode, from loaded data for edit mode)
  const displayPerson = mode === 'add' ? person : loadedPerson;

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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={[fzText.sub, styles.loadingText]}>Loading...</Text>
      </View>
    );
  }

  if (mode === 'edit' && (!relation || !displayPerson)) {
    return (
      <View style={styles.centered}>
        <Text style={fzText.title}>Relation not found</Text>
        <Button mode="contained" onPress={() => router.back()} buttonColor={fz.ink} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: displayPerson?.name || (mode === 'add' ? 'Add Something' : 'Edit'),
          headerStyle: { backgroundColor: fz.paper },
          headerTintColor: fz.ink,
          headerTitleStyle: { fontFamily: fz.font, fontWeight: '600', fontSize: 18 },
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={fzText.titleLg}>
              {mode === 'add' ? 'Add something they’re into' : 'Edit'} for {displayPerson?.name}
            </Text>
            <Text style={[fzText.sub, styles.headerSub]}>
              {mode === 'add'
                ? 'A like, dislike, fear, skill, or anything worth remembering.'
                : 'Update this entry.'}
            </Text>

            <FormSection title="Type">
              <View style={styles.pillRow}>
                {RELATION_TYPE_OPTIONS.map((type) => (
                  <Pill
                    key={type.value}
                    label={type.label}
                    selected={relationType === type.value}
                    onPress={() => setRelationType(type.value)}
                  />
                ))}
              </View>
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
              <View style={styles.pillRow}>
                {STATUS_OPTIONS.map((option) => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={status === option.value}
                    onPress={() => setStatus(option.value)}
                  />
                ))}
              </View>
            </FormSection>

            {!TYPES_WITHOUT_INTENSITY.includes(relationType) && (
              <FormSection title="Intensity">
                <View style={styles.pillRow}>
                  {INTENSITY_OPTIONS.map((option) => (
                    <Pill
                      key={option.value}
                      label={option.label}
                      selected={intensity === option.value}
                      onPress={() => setIntensity(option.value)}
                    />
                  ))}
                </View>
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

            <View style={styles.spacer} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fz.paper,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: fz.paper,
  },
  loadingText: {
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
    borderRadius: fz.rButton,
  },
  content: {
    padding: fz.s.edge,
  },
  headerSub: {
    marginTop: 6,
    marginBottom: fz.s.lg,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
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
  spacer: {
    height: 40,
  },
});
