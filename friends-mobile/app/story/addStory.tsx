import { StyleSheet, View, ScrollView, Alert, StatusBar, BackHandler } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, Dialog, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useCreateStory } from '@/hooks/useStories';
import { useExtractStory } from '@/hooks/useExtraction';
import { useSettings } from '@/store/useSettings';
import type { AIServiceConfig } from '@/lib/ai/ai-service';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { createExtractionPrompt } from '@/lib/ai/prompts';
import { db, getCurrentUserId } from '@/lib/db';
import { people } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as Clipboard from 'expo-clipboard';
import MentionTextInput from '@/components/MentionTextInput';

export default function StoryInputScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [storyText, setStoryText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKeyDialogVisible, setApiKeyDialogVisible] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [promptPreviewDialogVisible, setPromptPreviewDialogVisible] = useState(false);
  const [promptPreviewText, setPromptPreviewText] = useState('');
  const [unsavedDialogVisible, setUnsavedDialogVisible] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const createStory = useCreateStory();
  const extractStory = useExtractStory();
  const { selectedModel, getActiveApiKey, setApiKey, loadApiKey, loadGeminiApiKey, loadSelectedModel, hasActiveApiKey } = useSettings();

  // Load API keys and model on mount
  useEffect(() => {
    loadApiKey();
    loadGeminiApiKey();
    loadSelectedModel();
  }, []);

  // Set navigation options
  useEffect(() => {
    navigation.setOptions({
      title: 'Tell a Story',
    });
  }, [navigation]);

  // Handle back button and unsaved changes
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (storyText.trim().length > 0 && !isProcessing) {
          setUnsavedDialogVisible(true);
          return true; // Prevent default back action
        }
        return false; // Allow default back action
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [storyText, isProcessing])
  );

  const handleDiscard = () => {
    setStoryText('');
    setUnsavedDialogVisible(false);
    if (pendingNavigation) {
      router.push(pendingNavigation as any);
      setPendingNavigation(null);
    } else {
      router.back();
    }
  };

  const handleCancelDiscard = () => {
    setUnsavedDialogVisible(false);
    setPendingNavigation(null);
  };

  const handleSubmit = async () => {
    if (storyText.trim().length < 10) {
      Alert.alert('Story too short', 'Please write at least 10 characters');
      return;
    }

    // Check if API key is set for selected model
    if (!hasActiveApiKey()) {
      Alert.alert(
        'API Key Required',
        'To use AI extraction, you need to set an API key for the selected model in Settings.',
        [
          { text: 'Go to Settings', onPress: () => router.push('/settings') },
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
        { text: 'View People', onPress: () => router.push('/') },
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
      const apiKey = getActiveApiKey();
      if (!apiKey) {
        throw new Error('No API key available for selected model');
      }
      
      const config: AIServiceConfig = {
        model: selectedModel,
        apiKey,
      };

      const result = await extractStory.mutateAsync({
        storyId: story.id,
        storyText: storyText,
        config,
      });

      // Step 3: Show results
      const message = `AI extraction complete!

✅ ${result.newPeople.length} new people created
✅ ${result.newRelations.length} relations auto-saved
${result.pendingReview > 0 ? `⏳ ${result.pendingReview} relations need your review` : ''}
${result.conflicts.length > 0 ? `⚠️ ${result.conflicts.length} conflicts detected` : ''}

Tokens used: ${result.tokensUsed || 'N/A'}`;

      const buttons = [{ text: 'View People', onPress: () => router.push('/stories') }];

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

  const handleShowPrompt = async () => {
    if (storyText.trim().length < 10) {
      Alert.alert('Story too short', 'Please write at least 10 characters');
      return;
    }

    try {
      // Get existing people for context
      const userId = await getCurrentUserId();
      const existingPeople = await db
        .select({ id: people.id, name: people.name })
        .from(people)
        .where(eq(people.userId, userId));

      // Generate the prompt
      const prompt = createExtractionPrompt({
        existingPeople,
        storyText: storyText.trim(),
      });

      setPromptPreviewText(prompt);
      setPromptPreviewDialogVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate prompt preview');
    }
  };

  const handleCopyPrompt = async () => {
    await Clipboard.setStringAsync(promptPreviewText);
    Alert.alert('Copied!', 'Prompt copied to clipboard');
  };

  const wordCount = storyText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedCost = wordCount > 0 ? '$0.02' : '$0.00';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(255, 255, 255, 0.8)" translucent />
      <View style={[styles.statusBarSpacer, { height: insets.top }]} />

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
        {/* Main Input */}
        <MentionTextInput
          placeholder="Had dinner with @Sarah last night. She's now vegan and really into yoga..."
          value={storyText}
          onChangeText={setStoryText}
          numberOfLines={16}
          style={styles.input}
        />

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <Text variant="bodySmall" style={styles.statsText}>
            {wordCount} words
          </Text>
          <Text variant="bodySmall" style={styles.statsDivider}>
            •
          </Text>
          <Text variant="bodySmall" style={styles.statsText}>
            ~{estimatedCost}
          </Text>
        </View>

        {/* Examples Hint */}
        <View style={styles.examplesSection}>
          <Text variant="labelMedium" style={styles.examplesTitle}>
            Quick examples
          </Text>
          <Text variant="bodySmall" style={styles.example}>
            "Met @Emma for coffee. She's training for a marathon"
          </Text>
          <Text variant="bodySmall" style={styles.example}>
            "@Mike's mother has dementia, he's caring for her"
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Fixed Bottom Action */}
      <View style={styles.bottomAction}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isProcessing}
          disabled={isProcessing || storyText.trim().length < 10}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          {isProcessing ? 'Processing...' : hasActiveApiKey() ? 'Save & Extract' : 'Save Story'}
        </Button>

        {/* DEV Button */}
        <Button
          mode="text"
          onPress={handleShowPrompt}
          disabled={storyText.trim().length < 10}
          style={styles.devButton}
          icon="code-tags"
          compact
        >
          Show Prompt
        </Button>
      </View>

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

      {/* Prompt Preview Dialog */}
      <Portal>
        <Dialog
          visible={promptPreviewDialogVisible}
          onDismiss={() => setPromptPreviewDialogVisible(false)}
          style={styles.promptDialog}
        >
          <Dialog.Title>AI Extraction Prompt</Dialog.Title>
          <Dialog.ScrollArea style={styles.promptScrollArea}>
            <ScrollView>
              <Text variant="bodySmall" style={styles.promptText}>
                {promptPreviewText}
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={handleCopyPrompt} icon="content-copy">
              Copy
            </Button>
            <Button onPress={() => setPromptPreviewDialogVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Unsaved Changes Dialog */}
      <Portal>
        <Dialog visible={unsavedDialogVisible} onDismiss={handleCancelDiscard}>
          <Dialog.Title>Unsaved Story</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              You have unsaved text. If you leave now, your story will be lost.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelDiscard}>Cancel</Button>
            <Button onPress={handleDiscard} textColor="#d32f2f">
              Discard
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  statusBarSpacer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 140,
  },
  input: {
    minHeight: 280,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  statsText: {
    opacity: 0.5,
    fontSize: 12,
  },
  statsDivider: {
    opacity: 0.3,
    marginHorizontal: 8,
  },
  examplesSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  examplesTitle: {
    marginBottom: 8,
    opacity: 0.7,
    fontWeight: '600',
  },
  example: {
    marginBottom: 6,
    opacity: 0.6,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  submitButton: {
    borderRadius: 12,
    marginBottom: 8,
  },
  submitButtonContent: {
    paddingVertical: 12,
  },
  devButton: {
    opacity: 0.5,
  },
  spacer: {
    height: 20,
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
  promptDialog: {
    maxHeight: '80%',
  },
  promptScrollArea: {
    maxHeight: 400,
  },
  promptText: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    padding: 16,
  },
});
