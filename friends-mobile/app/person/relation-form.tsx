import { StyleSheet, View, ScrollView, Alert, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { useState, useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateRelation, useUpdateRelation } from '@/hooks/useRelations';
import { devLogger } from '@/lib/utils/devLogger';
import { usePerson } from '@/hooks/usePeople';
import { db } from '@/lib/db';
import { relations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { RELATION_TYPE_OPTIONS, INTENSITY_OPTIONS } from '@/lib/constants/relations';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation refs for scroll indicators
  const relationTypeScrollAnim = useRef(new Animated.Value(0)).current;
  const intensityScrollAnim = useRef(new Animated.Value(0)).current;

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

  // Scroll indicator animation effect
  useEffect(() => {
    if (displayPerson && !isLoading) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        // Animate relation type scroll indicator
        Animated.sequence([
          Animated.timing(relationTypeScrollAnim, {
            toValue: -20, // Move left slightly
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(relationTypeScrollAnim, {
            toValue: 0, // Bounce back
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();

        // Animate intensity scroll indicator with slight delay
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(intensityScrollAnim, {
              toValue: -20, // Move left slightly
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(intensityScrollAnim, {
              toValue: 0, // Bounce back
              friction: 3,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
        }, 200);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [displayPerson, isLoading, relationTypeScrollAnim, intensityScrollAnim]);

  const handleSubmit = async () => {
    if (!objectLabel.trim()) {
      Alert.alert('Missing Information', 'Please enter what they like/dislike/etc.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'add') {
        await createRelation.mutateAsync({
          subjectId: personId!,
          subjectType: 'person',
          relationType: relationType as any,
          objectLabel: objectLabel.trim(),
          objectType: category.trim() || undefined,
          category: category.trim() || undefined,
          intensity: intensity as any,
          confidence: 1.0, // Manual entry = 100% confident
          source: 'manual',
          status: 'current',
        });

        Alert.alert('Success!', 'Relation added successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        await updateRelation.mutateAsync({
          id: relationId!,
          relationType: relationType as any,
          objectLabel: objectLabel.trim(),
          category: category.trim() || null,
          intensity: intensity as any,
        });

        Alert.alert('Success!', 'Relation updated successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${mode === 'add' ? 'add' : 'update'} relation. Please try again.`);
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
      case 'IS':
        return 'e.g., vegan, software engineer, introvert';
      case 'KNOWS':
        return 'e.g., Python, Spanish, how to cook';
      case 'HAS_SKILL':
        return 'e.g., programming, guitar, cooking';
      case 'FEARS':
        return 'e.g., heights, spiders, public speaking';
      case 'REGULARLY_DOES':
        return 'e.g., yoga, meditation, running';
      case 'WANTS_TO_ACHIEVE':
        return 'e.g., learn piano, run a marathon';
      case 'STRUGGLES_WITH':
        return 'e.g., anxiety, procrastination, sleep';
      case 'CARES_FOR':
        return 'e.g., elderly parent, pet, community';
      default:
        return 'Enter details...';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (mode === 'edit' && (!relation || !displayPerson)) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">Relation not found</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.container}>
          <View style={styles.content}>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="headlineSmall" style={styles.title}>
                  {mode === 'add' ? 'Add Relation' : 'Edit Relation'} for {displayPerson?.name}
                </Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                  {mode === 'add' ? 'Add information about this person' : 'Update information about this person'}
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleSmall" style={styles.label}>
                  Relation Type
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.typeScrollContainer}
                >
                  <Animated.View style={{
                    transform: [{ translateX: relationTypeScrollAnim }],
                  }}>
                    <View style={styles.typeGrid}>
                      {RELATION_TYPE_OPTIONS.map((type) => (
                        <Button
                          key={type.value}
                          mode={relationType === type.value ? 'contained' : 'outlined'}
                          onPress={() => setRelationType(type.value)}
                          style={styles.typeButton}
                          compact
                        >
                          {type.label}
                        </Button>
                      ))}
                    </View>
                  </Animated.View>
                </ScrollView>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <TextInput
                  mode="outlined"
                  label={`What they ${relationType.toLowerCase().replace('_', ' ')}`}
                  placeholder={getPlaceholder()}
                  value={objectLabel}
                  onChangeText={setObjectLabel}
                  style={styles.input}
                  autoFocus
                />

                <TextInput
                  mode="outlined"
                  label="Category (optional)"
                  placeholder="e.g., food, activity, music, sport"
                  value={category}
                  onChangeText={setCategory}
                  style={styles.input}
                />

                <Text variant="titleSmall" style={styles.label}>
                  Intensity
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.intensityScrollContainer}
                >
                  <Animated.View style={{
                    transform: [{ translateX: intensityScrollAnim }],
                  }}>
                    <SegmentedButtons
                      value={intensity}
                      onValueChange={setIntensity}
                      buttons={INTENSITY_OPTIONS.map(option => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      style={styles.segmented}
                    />
                  </Animated.View>
                </ScrollView>
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || !objectLabel.trim()}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              {mode === 'add' ? 'Add Relation' : 'Save Changes'}
            </Button>

            <Button mode="text" onPress={() => router.back()} disabled={isSubmitting}>
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
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  typeScrollContainer: {
    paddingVertical: 4,
  },
  typeButton: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  segmented: {
    marginBottom: 16,
  },
  intensityScrollContainer: {
    paddingVertical: 4,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  spacer: {
    height: 40,
  },
});