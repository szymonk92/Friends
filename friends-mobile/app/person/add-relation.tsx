import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Card } from 'react-native-paper';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateRelation } from '@/hooks/useRelations';
import { usePerson } from '@/hooks/usePeople';
import { relationTypeEnum, intensityEnum } from '@/lib/validation/schemas';

const RELATION_TYPES = [
  { label: 'Likes', value: 'LIKES', icon: 'heart' },
  { label: 'Dislikes', value: 'DISLIKES', icon: 'heart-broken' },
  { label: 'Is', value: 'IS', icon: 'account' },
  { label: 'Knows', value: 'KNOWS', icon: 'handshake' },
  { label: 'Has Skill', value: 'HAS_SKILL', icon: 'tools' },
  { label: 'Fears', value: 'FEARS', icon: 'alert' },
  { label: 'Regularly Does', value: 'REGULARLY_DOES', icon: 'repeat' },
  { label: 'Wants To Achieve', value: 'WANTS_TO_ACHIEVE', icon: 'target' },
  { label: 'Struggles With', value: 'STRUGGLES_WITH', icon: 'emoticon-sad' },
  { label: 'Cares For', value: 'CARES_FOR', icon: 'heart-circle' },
];

export default function AddRelationScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { data: person } = usePerson(personId!);
  const createRelation = useCreateRelation();

  const [relationType, setRelationType] = useState('LIKES');
  const [objectLabel, setObjectLabel] = useState('');
  const [category, setCategory] = useState('');
  const [intensity, setIntensity] = useState<string>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!objectLabel.trim()) {
      Alert.alert('Missing Information', 'Please enter what they like/dislike/etc.');
      return;
    }

    setIsSubmitting(true);

    try {
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
    } catch (error) {
      Alert.alert('Error', 'Failed to add relation. Please try again.');
      console.error('Add relation error:', error);
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Add Relation for {person?.name}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Manually add information about this person
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.label}>
              Relation Type
            </Text>
            <View style={styles.typeGrid}>
              {RELATION_TYPES.map((type) => (
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
            <SegmentedButtons
              value={intensity}
              onValueChange={setIntensity}
              buttons={[
                { value: 'weak', label: 'Weak' },
                { value: 'medium', label: 'Medium' },
                { value: 'strong', label: 'Strong' },
                { value: 'very_strong', label: 'Very Strong' },
              ]}
              style={styles.segmented}
            />
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
          Add Relation
        </Button>

        <Button mode="text" onPress={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>

        <View style={styles.spacer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
