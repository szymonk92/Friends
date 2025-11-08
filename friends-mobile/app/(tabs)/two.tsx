import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  HelperText,
  Dialog,
  Portal,
} from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useCreateStory } from '@/hooks/useStories';
import { useExtractStory } from '@/hooks/useExtraction';
import { useSettings } from '@/store/useSettings';
import { router } from 'expo-router';

export default function StoryInputScreen() {
  const [storyText, setStoryText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKeyDialogVisible, setApiKeyDialogVisible] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  const createStory = useCreateStory();
  const extractStory = useExtractStory();
  const { apiKey, setApiKey, loadApiKey, hasApiKey } = useSettings();

  // Load API key on mount
  useEffect(() => {
    loadApiKey();
  }, []);

  const handleSubmit = async () => {
    if (storyText.trim().length < 10) {
      Alert.alert('Story too short', 'Please write at least 10 characters');
      return;
    }

    // Check if API key is set
    if (!hasApiKey()) {
      Alert.alert(
        'API Key Required',
        'To use AI extraction, you need to set your Anthropic API key first.',
        [
          { text: 'Set API Key', onPress: () => setApiKeyDialogVisible(true) },
          {
            text: 'Save Without AI',
            onPress: () => saveStoryOnly(),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    await processStoryWithAI();
  };

  const saveStoryOnly = async () => {
    setIsProcessing(true);
    try {
      await createStory.mutateAsync({
        content: storyText,
        title: null,
        storyDate: new Date(),
      });

      Alert.alert('Story Saved!', 'Your story has been saved (without AI extraction).', [
        { text: 'View People', onPress: () => router.push('/(tabs)/') },
        { text: 'Add Another', onPress: () => setStoryText('') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save story. Please try again.');
      console.error('Story save error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const processStoryWithAI = async () => {
    setIsProcessing(true);
    try {
      // Step 1: Save story first
      const story = await createStory.mutateAsync({
        content: storyText,
        title: null,
        storyDate: new Date(),
      });

      // Step 2: Extract with AI
      const result = await extractStory.mutateAsync({
        storyId: story.id,
        storyText: storyText,
        apiKey: apiKey!,
      });

      // Step 3: Show results
      const message = `AI extraction complete!

✅ ${result.newPeople.length} new people created
✅ ${result.newRelations.length} relations auto-saved
${result.pendingReview > 0 ? `⏳ ${result.pendingReview} relations need your review` : ''}
${result.conflicts.length > 0 ? `⚠️ ${result.conflicts.length} conflicts detected` : ''}

Tokens used: ${result.tokensUsed || 'N/A'}`;

      const buttons = [
        { text: 'View People', onPress: () => router.push('/(tabs)/') },
      ];

      if (result.pendingReview > 0) {
        buttons.unshift({
          text: 'Review Now',
          onPress: () => router.push('/review-extractions'),
        });
      }

      buttons.push({ text: 'Add Another', onPress: () => setStoryText('') });

      Alert.alert('Success!', message, buttons);
    } catch (error: any) {
      console.error('AI extraction error:', error);
      Alert.alert(
        'Extraction Failed',
        `Failed to extract relations: ${error.message || 'Unknown error'}

The story was saved, but AI extraction didn't work. Check your API key and try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (tempApiKey.trim().length === 0) {
      Alert.alert('Invalid API Key', 'Please enter a valid API key');
      return;
    }

    try {
      await setApiKey(tempApiKey.trim());
      setApiKeyDialogVisible(false);
      setTempApiKey('');
      Alert.alert('Success', 'API key saved! You can now use AI extraction.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key. Please try again.');
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
          {!hasApiKey() && (
            <Button
              mode="outlined"
              onPress={() => setApiKeyDialogVisible(true)}
              style={styles.apiKeyButton}
              icon="key"
            >
              Set API Key
            </Button>
          )}
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
            {wordCount} words • Est. cost: {estimatedCost} • API key:{' '}
            {hasApiKey() ? '✓ Set' : '✗ Not set'}
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
        {isProcessing ? 'Processing...' : hasApiKey() ? 'Save & Extract' : 'Save Story'}
      </Button>

      <View style={styles.spacer} />

      {/* API Key Dialog */}
      <Portal>
        <Dialog visible={apiKeyDialogVisible} onDismiss={() => setApiKeyDialogVisible(false)}>
          <Dialog.Title>Set Anthropic API Key</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Enter your Anthropic API key to enable AI extraction.
            </Text>
            <Text variant="bodySmall" style={styles.dialogHelper}>
              Get your key from: https://console.anthropic.com
            </Text>
            <TextInput
              mode="outlined"
              label="API Key"
              placeholder="sk-ant-..."
              value={tempApiKey}
              onChangeText={setTempApiKey}
              secureTextEntry
              style={styles.apiKeyInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setApiKeyDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveApiKey}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  apiKeyButton: {
    marginTop: 12,
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
  dialogText: {
    marginBottom: 8,
  },
  dialogHelper: {
    marginBottom: 16,
    opacity: 0.7,
  },
  apiKeyInput: {
    marginTop: 8,
  },
});
