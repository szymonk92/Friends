import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  StatusBar,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput, Button, Dialog, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useCreateStory } from '@/hooks/useStories';
import { useExtractStory } from '@/hooks/useExtraction';
import { useSettings } from '@/store/useSettings';
import type { AIServiceConfig, AIDebugInfo } from '@/lib/ai/ai-service';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { createExtractionPrompt } from '@/lib/ai/prompts';
import { db, getCurrentUserId } from '@/lib/db';
import { people } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as Clipboard from 'expo-clipboard';
import MentionTextInput from '@/components/story/MentionTextInput';
import { devLogger } from '@/lib/utils/devLogger';
import PersonSelector from '@/components/story/PersonSelector';
import AmbiguityResolutionDialog from '@/components/story/AmbiguityResolutionDialog';
import { Chip, Avatar } from 'react-native-paper';
import { usePeople } from '@/hooks/usePeople';

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
  const [debugInfo, setDebugInfo] = useState<AIDebugInfo | null>(null);
  const [debugDialogVisible, setDebugDialogVisible] = useState(false);

  // @+ Feature State
  const [personSelectorVisible, setPersonSelectorVisible] = useState(false);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  // Ambiguity Resolution State
  const [ambiguityDialogVisible, setAmbiguityDialogVisible] = useState(false);
  const [ambiguousMatches, setAmbiguousMatches] = useState<any[]>([]);
  const [forceNewPeopleNames, setForceNewPeopleNames] = useState<string[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);

  const createStory = useCreateStory();
  const extractStory = useExtractStory();
  const { data: allPeople } = usePeople();
  const {
    selectedModel,
    getActiveApiKey,
    setApiKey,
    loadApiKey,
    loadGeminiApiKey,
    loadSelectedModel,
    hasActiveApiKey,
  } = useSettings();

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
      devLogger.error('Failed to save story', { error, storyText: storyText.substring(0, 50) });
    } finally {
      setIsProcessing(false);
    }
  };

  const processStoryWithAI = async (
    existingStoryId?: string,
    overrides?: {
      taggedIds?: string[];
      newNames?: string[];
    }
  ) => {
    setIsProcessing(true);
    try {
      let storyId = existingStoryId;

      // Step 1: Save story first if not already saved
      if (!storyId) {
        const story = await createStory.mutateAsync({
          content: storyText,
          title: null,
          storyDate: new Date(),
        });
        storyId = story.id;
        setCurrentStoryId(story.id);
      }

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
        storyId: storyId!,
        storyText: storyText,
        config,
        explicitlyTaggedPersonIds: overrides?.taggedIds || selectedPersonIds,
        forceNewPeopleNames: overrides?.newNames || forceNewPeopleNames,
      });

      // Step 2.5: Check for Ambiguity
      if (result.ambiguousMatches && result.ambiguousMatches.length > 0) {
        setAmbiguousMatches(result.ambiguousMatches);
        setAmbiguityDialogVisible(true);
        setIsProcessing(false);
        return; // Stop here, wait for user resolution
      }

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

      if (result.debugInfo) {
        setDebugInfo(result.debugInfo);
        buttons.push({
          text: 'Debug',
          onPress: () => setDebugDialogVisible(true),
        });
      }

      Alert.alert('Success!', message, buttons);
    } catch (error: any) {
      devLogger.ai('AI extraction failed', { error, storyId: currentStoryId });
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

  const handleAmbiguityResolved = (resolutions: { [name: string]: string | 'NEW' | 'IGNORE' }) => {
    setAmbiguityDialogVisible(false);

    // Process resolutions
    const newSelectedIds = [...selectedPersonIds];
    const newForceNewNames = [...forceNewPeopleNames];

    Object.entries(resolutions).forEach(([name, resolution]) => {
      if (resolution === 'NEW') {
        newForceNewNames.push(name);
      } else if (resolution !== 'IGNORE') {
        // It's an ID
        if (!newSelectedIds.includes(resolution)) {
          newSelectedIds.push(resolution);
        }
      }
    });

    setSelectedPersonIds(newSelectedIds);
    setForceNewPeopleNames(newForceNewNames);

    // Re-run extraction with new context
    // We use a timeout to allow state to update and UI to refresh
    setTimeout(() => {
      processStoryWithAI(currentStoryId!, {
        taggedIds: newSelectedIds,
        newNames: newForceNewNames,
      });
    }, 100);
  };

  const handleRemovePerson = (id: string) => {
    setSelectedPersonIds((prev) => prev.filter((pId) => pId !== id));
  };

  const selectedPeopleObjects = allPeople?.filter((p) => selectedPersonIds.includes(p.id)) || [];

  const wordCount = storyText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedCost = wordCount > 0 ? '$0.02' : '$0.00';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(255, 255, 255, 0.8)" translucent />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
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

          {/* Explicitly Tagged People Chips */}
          {selectedPersonIds.length > 0 && (
            <View style={styles.chipsContainer}>
              <Text variant="labelSmall" style={styles.chipsLabel}>
                Tagged:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedPeopleObjects.map((person) => (
                  <Chip
                    key={person.id}
                    avatar={
                      person.photoPath ? (
                        <Avatar.Image size={24} source={{ uri: person.photoPath }} />
                      ) : (
                        <Avatar.Text size={24} label={person.name.substring(0, 2).toUpperCase()} />
                      )
                    }
                    onClose={() => handleRemovePerson(person.id)}
                    style={styles.chip}
                  >
                    {person.name}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}

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
              "Had lunch with @Ola and met her friend @+Fabian"
            </Text>
          </View>

          <View style={styles.spacer} />
        </ScrollView>

        {/* Fixed Bottom Action */}
        <View style={styles.bottomAction}>
          <View style={styles.actionRow}>
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
          </View>

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
      </KeyboardAvoidingView>

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

      {/* Debug Info Dialog */}
      <Portal>
        <Dialog
          visible={debugDialogVisible}
          onDismiss={() => setDebugDialogVisible(false)}
          style={styles.promptDialog}
        >
          <Dialog.Title>AI Debug Info</Dialog.Title>
          <Dialog.ScrollArea style={styles.promptScrollArea}>
            <ScrollView>
              {debugInfo && (
                <View>
                  <Text variant="labelLarge" style={styles.debugLabel}>
                    Model & Cost
                  </Text>
                  <Text variant="bodySmall" style={styles.debugValue}>
                    Model: {debugInfo.model}
                    {'\n'}
                    Tokens: {debugInfo.tokensUsed}
                    {'\n'}
                    Cost: ${debugInfo.cost?.toFixed(6) || 'N/A'}
                  </Text>

                  <Text variant="labelLarge" style={styles.debugLabel}>
                    System Prompt
                  </Text>
                  <Text variant="bodySmall" style={styles.debugCode}>
                    {debugInfo.systemPrompt || 'N/A'}
                  </Text>

                  <Text variant="labelLarge" style={styles.debugLabel}>
                    User Prompt (Story)
                  </Text>
                  <Text variant="bodySmall" style={styles.debugCode}>
                    {debugInfo.userPrompt}
                  </Text>

                  <Text variant="labelLarge" style={styles.debugLabel}>
                    Response Status
                  </Text>
                  <Text variant="bodySmall" style={styles.debugValue}>
                    Status: {debugInfo.responseStatus || 'N/A'}
                    {'\n'}
                    Headers: {JSON.stringify(debugInfo.requestHeaders || {}, null, 2)}
                  </Text>

                  <Text variant="labelLarge" style={styles.debugLabel}>
                    Raw Response
                  </Text>
                  <Text variant="bodySmall" style={styles.debugCode}>
                    {debugInfo.rawResponse}
                  </Text>
                </View>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              onPress={() => {
                Clipboard.setStringAsync(JSON.stringify(debugInfo, null, 2));
                Alert.alert('Copied', 'Debug info copied to clipboard');
              }}
            >
              Copy All
            </Button>
            <Button onPress={() => setDebugDialogVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <PersonSelector
        visible={personSelectorVisible}
        onDismiss={() => setPersonSelectorVisible(false)}
        onSelect={setSelectedPersonIds}
        initialSelectedIds={selectedPersonIds}
      />

      <AmbiguityResolutionDialog
        visible={ambiguityDialogVisible}
        ambiguousMatches={ambiguousMatches}
        onResolve={handleAmbiguityResolved}
        onCancel={() => {
          setAmbiguityDialogVisible(false);
          setIsProcessing(false);
        }}
      />
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagButton: {
    marginRight: 8,
    backgroundColor: '#e3f2fd',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
  },
  submitButtonContent: {
    paddingVertical: 8, // Reduced slightly to align with icon button
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  chipsLabel: {
    marginRight: 8,
    opacity: 0.6,
  },
  chip: {
    marginRight: 8,
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
  debugLabel: {
    marginTop: 16,
    marginBottom: 4,
    fontWeight: 'bold',
    color: '#666',
  },
  debugValue: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
  debugCode: {
    fontFamily: 'monospace',
    fontSize: 10,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
});
