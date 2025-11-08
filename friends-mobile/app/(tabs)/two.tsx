import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, HelperText } from 'react-native-paper';
import { useState } from 'react';
import { useCreateStory } from '@/hooks/useStories';
import { router } from 'expo-router';

export default function StoryInputScreen() {
  const [storyText, setStoryText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const createStory = useCreateStory();

  const handleSubmit = async () => {
    if (storyText.trim().length < 10) {
      Alert.alert('Story too short', 'Please write at least 10 characters');
      return;
    }

    setIsProcessing(true);

    try {
      // Save story to database
      const story = await createStory.mutateAsync({
        content: storyText,
        title: null,
        storyDate: new Date(),
      });

      Alert.alert(
        'Story Saved!',
        'Your story has been saved. AI extraction will process it shortly.',
        [
          {
            text: 'View People',
            onPress: () => router.push('/(tabs)/'),
          },
          {
            text: 'Add Another',
            onPress: () => setStoryText(''),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save story. Please try again.');
      console.error('Story save error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const wordCount = storyText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedCost = wordCount > 0 ? '$0.02' : '$0.00';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Tell a Story
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Share something about your friends, family, or anyone you know. Our AI will extract
            important details automatically.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            mode="outlined"
            label="Your Story"
            placeholder="Example: Had dinner with Sarah last night. She mentioned she's now vegan and really into yoga. We talked about her new job at Google..."
            value={storyText}
            onChangeText={setStoryText}
            multiline
            numberOfLines={12}
            style={styles.input}
          />
          <HelperText type="info">
            {wordCount} words • Est. cost: {estimatedCost}
          </HelperText>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.exampleTitle}>
            Example Stories
          </Text>
          <Text variant="bodySmall" style={styles.example}>
            • "Met Emma for coffee. She's training for a marathon and loves oat milk lattes."
          </Text>
          <Text variant="bodySmall" style={styles.example}>
            • "Mike mentioned his mother has dementia. He's been taking care of her part-time."
          </Text>
          <Text variant="bodySmall" style={styles.example}>
            • "Sarah and Tom broke up last month. She's uncomfortable talking about it."
          </Text>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isProcessing}
        disabled={isProcessing || storyText.trim().length < 10}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {isProcessing ? 'Processing...' : 'Save & Extract'}
      </Button>

      <View style={styles.spacer} />
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
    lineHeight: 20,
  },
  input: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  exampleTitle: {
    marginBottom: 12,
  },
  example: {
    marginBottom: 8,
    opacity: 0.7,
    lineHeight: 18,
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  spacer: {
    height: 40,
  },
});
