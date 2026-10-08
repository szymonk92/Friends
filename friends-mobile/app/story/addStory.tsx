import {
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Text as RNText,
} from 'react-native';
import { Text, TextInput, Button, Portal } from 'react-native-paper';
import { Dialog } from '@/components/KeyboardAwareDialog';
import { useState, useEffect, useCallback } from 'react';
import { useCreateStory } from '@/hooks/useStories';
import { useExtractStory } from '@/hooks/useExtraction';
import { useSettings } from '@/store/useSettings';
import type { AIServiceConfig, AIDebugInfo } from '@/lib/ai/ai-service';
import { router, useFocusEffect, useNavigation, useLocalSearchParams } from 'expo-router';
import { createExtractionPrompt } from '@/lib/ai/prompts';
import { db, getCurrentUserId } from '@/lib/db';
import { people } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as Clipboard from 'expo-clipboard';
import MentionTextInput from '@/components/story/MentionTextInput';
import { devLogger } from '@/lib/utils/devLogger';
import AmbiguityResolutionDialog from '@/components/story/AmbiguityResolutionDialog';
import { FormSection } from '@/components/FormKit';
import { Pill } from '@/components/Pill';
import { PersonPickerModal } from '@/components/PersonPickerModal';
import { usePeople, usePerson } from '@/hooks/usePeople';
import { fz, fzText } from '@/lib/design/tokens';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fzAlert } from '@/lib/utils/confirm';

export default function StoryInputScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { personId: prefillPersonId } = useLocalSearchParams<{ personId?: string }>();
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>(
    prefillPersonId ? [prefillPersonId] : []
  );

  // Ambiguity Resolution State
  const [ambiguityDialogVisible, setAmbiguityDialogVisible] = useState(false);
  const [ambiguousMatches, setAmbiguousMatches] = useState<any[]>([]);
  const [forceNewPeopleNames, setForceNewPeopleNames] = useState<string[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);

  const createStory = useCreateStory();
  const extractStory = useExtractStory();
  const { data: allPeople } = usePeople();
  const { data: prefillPerson } = usePerson(prefillPersonId ?? '');
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
    navigation.setOptions(
      prefillPerson
        ? {
            headerTitle: () => (
              <RNText style={styles.headerTitle} numberOfLines={1}>
                {t('addStory.quickNote')} ·{' '}
                <RNText style={styles.headerTitleName}>{prefillPerson.name}</RNText>
              </RNText>
            ),
          }
        : { title: t('addStory.title') }
    );
  }, [navigation, prefillPerson, t]);

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
      fzAlert(t('addStory.tooShortTitle'), t('addStory.tooShortMessage'));
      return;
    }

    // No AI key → the story is still saved, just not extracted.
    if (!hasActiveApiKey()) {
      await saveStoryOnly();
      return;
    }

    // Retry after a failed extraction reuses the already-saved story.
    await processStoryWithAI(currentStoryId ?? undefined);
  };

  const saveStoryOnly = async () => {
    if (storyText.trim().length < 10) {
      fzAlert(t('addStory.tooShortTitle'), t('addStory.tooShortMessage'));
      return;
    }
    // Already saved by a failed extraction attempt — don't duplicate it.
    if (currentStoryId) {
      router.back();
      return;
    }
    setIsProcessing(true);
    try {
      await createStory.mutateAsync({
        content: storyText,
        title: null,
        storyDate: new Date(),
      });

      router.back();
    } catch (error) {
      fzAlert(t('common.error'), t('addStory.saveFailed'));
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
        throw new Error(t('addStory.noKey'));
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
      const message = `${t('addStory.extractionComplete')}

✅ ${t('addStory.newPeopleCreated', { count: result.newPeople.length })}
✅ ${t('addStory.relationsSaved', { count: result.newRelations.length })}
${result.pendingReview > 0 ? `⏳ ${t('addStory.needReview', { count: result.pendingReview })}` : ''}
${result.conflicts.length > 0 ? `⚠️ ${t('addStory.conflicts', { count: result.conflicts.length })}` : ''}

${t('addStory.tokensUsed', { tokens: result.tokensUsed || 'N/A' })}`;

      const buttons = [
        {
          text: prefillPerson ? t('addStory.backToProfile') : t('addStory.viewPeople'),
          onPress: () =>
            prefillPerson ? router.push(`/person/${prefillPerson.id}`) : router.push('/stories'),
        },
      ];

      if (result.pendingReview > 0) {
        buttons.unshift({
          text: t('addStory.reviewNow'),
          onPress: () => router.push('/review-extractions'),
        });
      }

      buttons.push({
        text: t('addStory.addAnother'),
        onPress: () => {
          setStoryText('');
          setCurrentStoryId(null);
        },
      });

      if (result.debugInfo) {
        setDebugInfo(result.debugInfo);
        buttons.push({
          text: t('addStory.debug'),
          onPress: () => setDebugDialogVisible(true),
        });
      }

      fzAlert(t('addStory.successTitle'), message, buttons);
    } catch (error: any) {
      devLogger.ai('AI extraction failed', { error, storyId: currentStoryId });
      fzAlert(
        t('addStory.extractionFailedTitle'),
        t('addStory.extractionFailedMessage', {
          error: error.message || t('common.unknownError'),
        }),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (tempApiKey.trim().length === 0) {
      fzAlert(t('addStory.invalidKeyTitle'), t('addStory.invalidKeyMessage'));
      return;
    }

    try {
      await setApiKey(tempApiKey.trim());
      setApiKeyDialogVisible(false);
      setTempApiKey('');
      fzAlert(t('common.success'), t('addStory.keySaved'));
    } catch (error) {
      fzAlert(t('common.error'), t('addStory.keySaveFailed'));
    }
  };

  const handleShowPrompt = async () => {
    if (storyText.trim().length < 10) {
      fzAlert(t('addStory.tooShortTitle'), t('addStory.tooShortMessage'));
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
      fzAlert(t('common.error'), t('addStory.promptFailed'));
    }
  };

  const handleCopyPrompt = async () => {
    await Clipboard.setStringAsync(promptPreviewText);
    fzAlert(t('addStory.copiedTitle'), t('addStory.promptCopied'));
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

  const togglePerson = (id: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const selectedPeopleObjects = allPeople?.filter((p) => selectedPersonIds.includes(p.id)) || [];

  const wordCount = storyText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedCost = wordCount > 0 ? '$0.02' : '$0.00';
  const hasKey = hasActiveApiKey();
  const canSave = !isProcessing && storyText.trim().length >= 10;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <FormSection title={t('addStory.people')}>
            <View style={styles.pillRow}>
              {selectedPeopleObjects.map((person) => (
                <Pill
                  key={person.id}
                  label={person.name}
                  selected
                  onClose={() => togglePerson(person.id)}
                />
              ))}
              <Pill
                icon="plus"
                label={t('addStory.tagPeople')}
                variant="outline"
                onPress={() => setPickerOpen(true)}
              />
            </View>
          </FormSection>

          <FormSection title={t('addStory.story')}>
            <MentionTextInput
              placeholder={
                prefillPerson
                  ? t('addStory.placeholderPerson', { name: prefillPerson.name })
                  : t('addStory.placeholder')
              }
              value={storyText}
              onChangeText={setStoryText}
              numberOfLines={12}
              style={styles.input}
            />
            <View style={styles.statsBar}>
              <Text style={fzText.meta}>{t('addStory.words', { count: wordCount })}</Text>
              {hasKey && (
                <>
                  <Text style={fzText.meta}>·</Text>
                  <Text style={fzText.meta}>~{estimatedCost}</Text>
                </>
              )}
            </View>
          </FormSection>

          <View style={styles.examplesSection}>
            <Text style={fzText.label}>{t('addStory.examples')}</Text>
            <Text style={styles.example}>{t('addStory.example1')}</Text>
            <Text style={styles.example}>{t('addStory.example2')}</Text>
          </View>

          <Pressable
            onPress={handleShowPrompt}
            disabled={!canSave}
            style={[styles.devLink, !canSave && styles.disabled]}
          >
            <Text style={fzText.meta}>{t('addStory.showPrompt')}</Text>
          </Pressable>
        </ScrollView>

        <View style={[styles.bottomAction, { paddingBottom: fz.s.md + insets.bottom }]}>
          {hasKey && (
            <Pressable
              accessibilityRole="button"
              onPress={saveStoryOnly}
              disabled={!canSave}
              style={[styles.secondaryBtn, !canSave && styles.disabled]}
            >
              <Text style={fzText.btnOutline}>{t('addStory.saveOnly')}</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit}
            disabled={!canSave}
            style={[styles.primaryBtn, !canSave && styles.disabled]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={fzText.btn}>
                {hasKey ? t('addStory.saveExtract') : t('addStory.saveStory')}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* API Key Dialog */}
      <Portal>
        <Dialog
          visible={apiKeyDialogVisible}
          onDismiss={() => setApiKeyDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t('addStory.setKeyTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={[styles.dialogText, styles.dialogFont]}>
              {t('addStory.setKeyMessage')}
            </Text>
            <Text variant="bodySmall" style={[styles.dialogHelper, styles.dialogFont]}>
              {t('addStory.getKey')} https://console.anthropic.com
            </Text>
            <TextInput
              mode="outlined"
              label={t('addStory.apiKey')}
              placeholder="sk-ant-..."
              value={tempApiKey}
              onChangeText={setTempApiKey}
              secureTextEntry
              style={[styles.apiKeyInput, styles.dialogFont]}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={() => setApiKeyDialogVisible(false)}>
              {t('common.cancel')}
            </Button>
            <Button labelStyle={styles.dialogFont} onPress={handleSaveApiKey}>
              {t('common.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Prompt Preview Dialog */}
      <Portal>
        <Dialog
          visible={promptPreviewDialogVisible}
          onDismiss={() => setPromptPreviewDialogVisible(false)}
          style={[styles.dialog, styles.promptDialog]}
        >
          <Dialog.Title style={styles.dialogTitle}>{t('addStory.promptTitle')}</Dialog.Title>
          <Dialog.ScrollArea style={styles.promptScrollArea}>
            <ScrollView>
              <Text variant="bodySmall" style={styles.promptText}>
                {promptPreviewText}
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={handleCopyPrompt} icon="content-copy">
              {t('addStory.copy')}
            </Button>
            <Button labelStyle={styles.dialogFont} onPress={() => setPromptPreviewDialogVisible(false)}>
              {t('common.close')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Unsaved Changes Dialog */}
      <Portal>
        <Dialog visible={unsavedDialogVisible} onDismiss={handleCancelDiscard} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{t('addStory.unsavedTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogFont}>
              {t('addStory.unsavedMessage')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button labelStyle={styles.dialogFont} onPress={handleCancelDiscard}>
              {t('common.cancel')}
            </Button>
            <Button labelStyle={styles.dialogFont} onPress={handleDiscard} textColor="#d32f2f">
              {t('addStory.discard')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Debug Info Dialog */}
      <Portal>
        <Dialog
          visible={debugDialogVisible}
          onDismiss={() => setDebugDialogVisible(false)}
          style={[styles.dialog, styles.promptDialog]}
        >
          <Dialog.Title style={styles.dialogTitle}>{t('addStory.debugTitle')}</Dialog.Title>
          <Dialog.ScrollArea style={styles.promptScrollArea}>
            <ScrollView>
              {debugInfo && (
                <View>
                  <Text variant="labelLarge" style={[styles.debugLabel, styles.dialogFont]}>
                    {t('addStory.debugModel')}
                  </Text>
                  <Text variant="bodySmall" style={styles.debugValue}>
                    Model: {debugInfo.model}
                    {'\n'}
                    Tokens: {debugInfo.tokensUsed}
                    {'\n'}
                    Cost: ${debugInfo.cost?.toFixed(6) || 'N/A'}
                  </Text>

                  <Text variant="labelLarge" style={[styles.debugLabel, styles.dialogFont]}>
                    {t('addStory.debugSystem')}
                  </Text>
                  <Text variant="bodySmall" style={styles.debugCode}>
                    {debugInfo.systemPrompt || 'N/A'}
                  </Text>

                  <Text variant="labelLarge" style={[styles.debugLabel, styles.dialogFont]}>
                    {t('addStory.debugUser')}
                  </Text>
                  <Text variant="bodySmall" style={styles.debugCode}>
                    {debugInfo.userPrompt}
                  </Text>

                  <Text variant="labelLarge" style={[styles.debugLabel, styles.dialogFont]}>
                    {t('addStory.debugStatus')}
                  </Text>
                  <Text variant="bodySmall" style={styles.debugValue}>
                    Status: {debugInfo.responseStatus || 'N/A'}
                    {'\n'}
                    Headers: {JSON.stringify(debugInfo.requestHeaders || {}, null, 2)}
                  </Text>

                  <Text variant="labelLarge" style={[styles.debugLabel, styles.dialogFont]}>
                    {t('addStory.debugRaw')}
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
              labelStyle={styles.dialogFont}
              onPress={() => {
                Clipboard.setStringAsync(JSON.stringify(debugInfo, null, 2));
                fzAlert(t('addStory.copiedTitle'), t('addStory.debugCopied'));
              }}
            >
              {t('addStory.copyAll')}
            </Button>
            <Button labelStyle={styles.dialogFont} onPress={() => setDebugDialogVisible(false)}>
              {t('common.close')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <PersonPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('addStory.people')}
        people={allPeople ?? []}
        selectedIds={selectedPersonIds}
        onToggle={togglePerson}
        multi
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
    backgroundColor: fz.paper,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: fz.s.edge,
    paddingTop: fz.s.md,
  },
  input: {
    minHeight: 240,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: fz.s.sm,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: fz.s.sm,
    marginTop: fz.s.md,
  },
  examplesSection: {
    padding: fz.s.xl,
    backgroundColor: fz.surfaceSoft,
    borderRadius: fz.rCard,
  },
  example: {
    ...fzText.sub,
    marginTop: fz.s.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  devLink: {
    alignSelf: 'center',
    marginTop: fz.s.lg,
    padding: fz.s.sm,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: fz.s.sm,
    backgroundColor: fz.paper,
    paddingHorizontal: fz.s.edge,
    paddingTop: fz.s.md,
    borderTopWidth: 1,
    borderTopColor: fz.hairline,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: fz.ink,
    borderRadius: fz.rButton,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: fz.card,
    borderWidth: 1.5,
    borderColor: fz.outline,
    borderRadius: fz.rButton,
    paddingVertical: 14,
    paddingHorizontal: fz.s.xl,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  dialog: {
    borderRadius: fz.rCard,
    backgroundColor: fz.card,
  },
  dialogTitle: {
    fontFamily: fz.font,
  },
  dialogFont: {
    fontFamily: fz.font,
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
    color: fz.textBody,
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
  headerTitle: {
    fontFamily: fz.font,
    fontWeight: '500',
    fontSize: 18,
    color: fz.ink,
  },
  headerTitleName: {
    fontFamily: fz.font,
    fontWeight: '700',
    fontSize: 18,
    color: fz.ink,
  },
});
