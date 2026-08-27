import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { db, getCurrentUserId } from '@/lib/db';
import { stories, pendingExtractions, people, relations } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { useDeleteStory } from '@/hooks/useStories';
import { useExtractRelations } from '@/hooks/useAIExtraction';
import {
  useApprovePendingExtraction,
  useRejectPendingExtraction,
  usePendingExtractionsCount,
} from '@/hooks/usePendingExtractions';
import { createSystemPrompt } from '@/lib/ai/prompts';
import { formatRelativeTime } from '@/lib/utils/format';
import { useSettings, AI_MODELS } from '@/store/useSettings';
import { fz, fzText } from '@/lib/design/tokens';
import { HeaderBack } from '@/components/HeaderBack';
import { IconCircle } from '@/components/IconCircle';
import { Pill } from '@/components/Pill';

export default function StoryDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deleteStory = useDeleteStory();
  const extractRelations = useExtractRelations();
  const approveExtraction = useApprovePendingExtraction();
  const rejectExtraction = useRejectPendingExtraction();
  const { hasActiveApiKey, selectedModel } = useSettings();
  const [selectedExtraction, setSelectedExtraction] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [expandedDebugSections, setExpandedDebugSections] = useState<{
    systemPrompt: boolean;
    contextUpdate: boolean;
    sentText: boolean;
    aiReply: boolean;
    tokenUsage: boolean;
  }>({
    systemPrompt: false,
    contextUpdate: false,
    sentText: false,
    aiReply: false,
    tokenUsage: false,
  });
  const [debugData, setDebugData] = useState<{
    systemPrompt?: string;
    contextUpdate?: string;
    sentText?: string;
    reply?: string;
    tokenUsage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    costUsd?: number;
    cost?: number;
    sentData?: any;
    receivedData?: any;
    conflictsCount?: number;
  } | null>(null);

  const toggleDebugSection = (section: keyof typeof expandedDebugSections) => {
    setExpandedDebugSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Check for pending extractions across all stories
  const { data: pendingCount = 0 } = usePendingExtractionsCount();

  const {
    data: story,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['story', id],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const result = await db
        .select()
        .from(stories)
        .where(and(eq(stories.id, id!), eq(stories.userId, userId), isNull(stories.deletedAt)))
        .limit(1);

      return result[0] || null;
    },
    enabled: !!id,
  });

  // Get pending extractions for this story
  const { data: extractions = [] } = useQuery({
    queryKey: ['story-extractions', id],
    queryFn: async () => {
      const results = await db
        .select()
        .from(pendingExtractions)
        .where(eq(pendingExtractions.storyId, id!));

      return results;
    },
    enabled: !!id,
  });

  // Load debug info from extractedData when story loads
  useEffect(() => {
    if (story?.extractedData) {
      try {
        const extractedData = JSON.parse(story.extractedData);

        // Normalize debugInfo shapes because different paths write different keys
        // - AIDebugInfo uses { rawResponse, userPrompt, tokensUsed }
        // - some UI paths expect { reply, sentText, tokenUsage }
        if (extractedData.debugInfo) {
          const raw = extractedData.debugInfo;

          const normalized = {
            // prefer existing more-descriptive keys, then fall back
            systemPrompt: raw.systemPrompt ?? raw.system_prompt ?? raw.systemMessage ?? undefined,
            sentText:
              raw.sentText ?? raw.userPrompt ?? raw.user_prompt ?? raw.userPromptText ?? undefined,
            contextUpdate:
              raw.contextUpdate ??
              raw.context_update ??
              raw.context ??
              raw.sentData?.contextUpdate ??
              undefined,
            reply: raw.reply ?? raw.rawResponse ?? raw.response ?? undefined,
            tokenUsage:
              raw.tokenUsage ||
              (raw.tokensUsed !== undefined
                ? {
                    totalTokens: raw.tokensUsed,
                    inputTokens: Math.floor(raw.tokensUsed * 0.67),
                    outputTokens: Math.floor(raw.tokensUsed * 0.33),
                  }
                : undefined),
            // include cost explicitly and keep any additional debug fields intact so we can inspect them if present
            costUsd: raw.costUsd ?? raw.cost ?? undefined,
            ...raw,
          };

          setDebugData(normalized);
        }
      } catch (error) {
        console.error('Failed to parse extracted data:', error);
      }
    }
  }, [story]);

  const handleExtractRelations = async () => {
    if (!hasActiveApiKey()) {
      const modelName = AI_MODELS[selectedModel]?.name || selectedModel;
      Alert.alert(
        'API Key Required',
        `Please configure your ${modelName} API key in Settings before using AI extraction.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => router.push('/settings') },
        ]
      );
      return;
    }

    Alert.alert(
      'Extract Relations',
      'This will use AI to extract people, preferences, and relationships from your story. Debug information will be saved for review.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Extract',
          onPress: async () => {
            try {
              // Prepare all debug data upfront
              const systemPrompt = createSystemPrompt();
              const userId = await getCurrentUserId();
              const existingPeople = await db
                .select({ id: people.id, name: people.name })
                .from(people)
                .where(and(eq(people.userId, userId), isNull(people.deletedAt)));

              const existingRelations = await db
                .select({
                  relationType: relations.relationType,
                  objectLabel: relations.objectLabel,
                  subjectId: relations.subjectId,
                })
                .from(relations)
                .where(and(eq(relations.userId, userId), isNull(relations.deletedAt)));

              // Create the extraction message that will be sent
              const contextUpdate = `CURRENT DATABASE STATE:\n\nEXISTING PEOPLE:\n${
                existingPeople.length > 0
                  ? existingPeople.map((p) => `- ${p.name} (ID: ${p.id})`).join('\n')
                  : 'None yet'
              }\n\nEXISTING RELATIONS:\n${
                existingRelations.length > 0
                  ? existingRelations
                      .map(
                        (r) =>
                          `- ${existingPeople.find((p) => p.id === r.subjectId)?.name || 'Unknown'}: ${r.relationType} "${r.objectLabel}"`
                      )
                      .join('\n')
                  : 'None yet'
              }`;

              const sentText = `EXTRACT RELATIONS FROM THIS STORY:\n\n"${story?.content}"\n\nPlease analyze this story and extract people, their relationships, and any conflicts with existing data. Respond with JSON only.`;

              // Run the extraction
              const result = await extractRelations.mutateAsync(id!);

              // Capture ALL debug data in a single update to avoid race conditions
              const debugInfo = {
                systemPrompt,
                sentText,
                reply: result.rawResponse,
                tokenUsage: {
                  totalTokens: result.tokensUsed,
                  inputTokens: Math.floor((result.tokensUsed || 0) * 0.67),
                  outputTokens: Math.floor((result.tokensUsed || 0) * 0.33),
                },
                sentData: {
                  storyId: id,
                  existingPeopleCount: existingPeople.length,
                  existingRelationsCount: existingRelations.length,
                  contextUpdate,
                  timestamp: new Date().toISOString(),
                },
                receivedData: {
                  result,
                  extractedData: story?.extractedData ? JSON.parse(story.extractedData) : null,
                  timestamp: new Date().toISOString(),
                },
                conflictsCount: result.conflicts || 0,
              };

              setDebugData(debugInfo);

              refetch();
              Alert.alert(
                'Extraction Complete',
                `Successfully extracted:\n• ${result.newPeople} new people\n• ${result.autoAcceptedRelations} auto-accepted relations\n• ${result.pendingRelations} relations pending review\n• ${result.conflicts} conflicts detected\n\nTokens used: ${result.tokensUsed}\nProcessing time: ${result.processingTime}ms`
              );
            } catch (error) {
              Alert.alert(
                'Extraction Failed',
                error instanceof Error ? error.message : 'Unknown error occurred'
              );
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    const hasExtractions = extractions.length > 0 || story?.aiProcessed;

    Alert.alert(
      'Delete Story',
      hasExtractions
        ? 'Are you sure you want to delete this story?\n\nNote: Any people, relations, or information extracted from this story will NOT be deleted. Only the story text itself will be removed.'
        : 'Are you sure you want to delete this story?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStory.mutateAsync(id!);
              Alert.alert('Success', 'Story deleted successfully');
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete story. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleApproveExtraction = async (extractionId: string) => {
    try {
      // Prevent double-clicking
      if (approveExtraction.isPending) return;

      await approveExtraction.mutateAsync(extractionId);
      setSelectedExtraction(null);
      refetch();
      Alert.alert('Success', 'Relation approved and added to your network!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to approve relation. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleRejectExtraction = async (extractionId: string) => {
    try {
      await rejectExtraction.mutateAsync({ extractionId });
      setSelectedExtraction(null);
      refetch();
      Alert.alert('Success', 'Relation rejected.');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reject relation. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const AppBar = ({ title }: { title: string }) => (
    <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
      <View style={styles.appBarRow}>
        <HeaderBack onPress={() => router.back()} />
        <RNText style={fzText.screenTitle} numberOfLines={1}>
          {title}
        </RNText>
        <IconCircle icon="trash" onPress={handleDelete} />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <AppBar title="Story" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fz.ink} />
        </View>
      </View>
    );
  }

  if (!story) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <AppBar title="Story Not Found" />
        <View style={styles.centered}>
          <RNText style={fzText.sub}>Story not found</RNText>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <RNText style={fzText.btn}>Go Back</RNText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const wordCount = story.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      <AppBar title={story.title || 'Story Details'} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        {/* Story Metadata */}
        <View style={styles.card}>
          <View style={styles.metaRow}>
            <RNText style={[fzText.label, styles.metaLabel]}>Created</RNText>
            <RNText style={fzText.sub}>{formatRelativeTime(new Date(story.createdAt))}</RNText>
          </View>

          {story.storyDate && (
            <View style={styles.metaRow}>
              <RNText style={[fzText.label, styles.metaLabel]}>Event Date</RNText>
              <RNText style={fzText.sub}>
                {new Date(story.storyDate).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </RNText>
            </View>
          )}

          <View style={styles.chipRow}>
            <Pill label={`${wordCount} words`} icon="book" />
            {story.aiProcessed && <Pill label="AI Processed" icon="checkCircle" />}
          </View>
        </View>

        {/* AI Extraction Action */}
        {!story.aiProcessed && (
          <View style={styles.card}>
            <RNText style={fzText.title}>AI Analysis</RNText>
            <View style={styles.divider} />
            {pendingCount > 0 ? (
              <>
                <RNText style={[fzText.body, { marginBottom: fz.s.md }]}>
                  You have {pendingCount} pending extraction{pendingCount !== 1 ? 's' : ''} waiting
                  for review from previous stories.
                </RNText>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => router.push('/review-extractions')}
                  activeOpacity={0.8}
                >
                  <RNText style={fzText.btn}>Review Now ({pendingCount})</RNText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <RNText style={[fzText.body, { marginBottom: fz.s.md }]}>
                  Use AI to automatically extract people, preferences, and relationships from this
                  story. The AI will identify @mentions, detect likes/dislikes, and create
                  connections.
                </RNText>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    extractRelations.isPending && { opacity: 0.5 },
                  ]}
                  onPress={handleExtractRelations}
                  disabled={extractRelations.isPending}
                  activeOpacity={0.8}
                >
                  <RNText style={fzText.btn}>
                    {extractRelations.isPending ? 'Extracting...' : 'Extract Relations'}
                  </RNText>
                </TouchableOpacity>
                {!hasActiveApiKey() && (
                  <RNText style={styles.apiKeyWarning}>
                    Note: API key required for {AI_MODELS[selectedModel]?.name}. Configure in
                    Settings.
                  </RNText>
                )}
              </>
            )}
          </View>
        )}

        {/* Story Content */}
        <View style={styles.card}>
          <RNText style={fzText.title}>Story Content</RNText>
          <View style={styles.divider} />
          <RNText style={styles.storyText}>{story.content}</RNText>
        </View>

        {/* AI Extraction Info */}
        {story.aiProcessed && (
          <View style={styles.card}>
            <RNText style={fzText.title}>AI Extracted Relations</RNText>
            <View style={styles.divider} />

            {extractions.length > 0 ? (
              <View>
                <RNText style={[fzText.body, { marginBottom: fz.s.md }]}>
                  {extractions.length} relation{extractions.length !== 1 ? 's' : ''} extracted from
                  this story:
                </RNText>
                {extractions.map((ext) =>
                  ext.reviewStatus === 'pending' ? (
                    <TouchableOpacity
                      key={ext.id}
                      style={styles.extractionItem}
                      onPress={() => setSelectedExtraction(ext)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.relationRow}>
                        <RNText style={styles.subjectName}>{ext.subjectName}</RNText>
                        <RNText style={styles.relationType}>{ext.relationType}</RNText>
                        <RNText style={styles.objectLabel}>{ext.objectLabel}</RNText>
                      </View>
                      <View style={styles.metadataRow}>
                        <Pill label="pending" variant="outline" />
                        <RNText style={styles.confidence}>
                          {((ext.confidence || 0) * 100).toFixed(0)}% confidence
                        </RNText>
                      </View>
                      {ext.extractionReason && (
                        <RNText style={styles.reason}>{ext.extractionReason}</RNText>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View key={ext.id} style={styles.extractionItem}>
                      <View style={styles.relationRow}>
                        <RNText style={styles.subjectName}>{ext.subjectName}</RNText>
                        <RNText style={styles.relationType}>{ext.relationType}</RNText>
                        <RNText style={styles.objectLabel}>{ext.objectLabel}</RNText>
                      </View>
                      <View style={styles.metadataRow}>
                        <Pill label={ext.reviewStatus} variant="outline" />
                        <RNText style={styles.confidence}>
                          {((ext.confidence || 0) * 100).toFixed(0)}% confidence
                        </RNText>
                      </View>
                      {ext.extractionReason && (
                        <RNText style={styles.reason}>{ext.extractionReason}</RNText>
                      )}
                    </View>
                  )
                )}
              </View>
            ) : (
              <RNText style={fzText.body}>
                This story was processed by AI but no extraction details are available.
              </RNText>
            )}

            <RNText style={styles.warning}>
              Note: Deleting this story will NOT remove any extracted people, relations, or
              information.
            </RNText>
          </View>
        )}

        {/* Debug Information */}
        <View style={styles.card}>
          <View style={styles.debugHeader}>
            <RNText style={fzText.title}>Debug Information</RNText>
            <TouchableOpacity
              onPress={() => setShowDebugInfo(!showDebugInfo)}
              activeOpacity={0.6}
              hitSlop={8}
            >
              <RNText style={styles.debugToggle}>
                {showDebugInfo ? 'Hide' : 'Show'} Data
              </RNText>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          {showDebugInfo && (
            <View>
              {!debugData ? (
                <View style={styles.debugSection}>
                  <RNText style={styles.debugTitle}>No Debug Data Available</RNText>
                  <RNText style={styles.debugText}>
                    Debug information is captured during AI extraction. Process this story with AI
                    to see the debug details.
                  </RNText>
                  <RNText style={styles.debugText}>
                    This story's AI processed status: {story.aiProcessed ? 'Yes' : 'No'}
                  </RNText>
                </View>
              ) : (
                <View>
                  {debugData.systemPrompt && (
                    <View
                      style={[
                        styles.debugSection,
                        expandedDebugSections.systemPrompt ? styles.debugSectionExpanded : null,
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => toggleDebugSection('systemPrompt')}
                        style={styles.debugSectionHeader}
                        activeOpacity={0.6}
                      >
                        <RNText style={styles.debugTitle}>
                          System Prompt {expandedDebugSections.systemPrompt ? '▼' : '▶'}
                        </RNText>
                      </TouchableOpacity>
                      {expandedDebugSections.systemPrompt && (
                        <ScrollView style={styles.debugTextContainer} nestedScrollEnabled>
                          <RNText style={styles.debugText} selectable>
                            {debugData.systemPrompt}
                          </RNText>
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {debugData.contextUpdate && (
                    <View
                      style={[
                        styles.debugSection,
                        expandedDebugSections.contextUpdate
                          ? styles.debugSectionExpanded
                          : null,
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => toggleDebugSection('contextUpdate')}
                        style={styles.debugSectionHeader}
                        activeOpacity={0.6}
                      >
                        <RNText style={styles.debugTitle}>
                          Context Sent to AI {expandedDebugSections.contextUpdate ? '▼' : '▶'}
                        </RNText>
                      </TouchableOpacity>
                      {expandedDebugSections.contextUpdate && (
                        <ScrollView style={styles.debugTextContainer} nestedScrollEnabled>
                          <RNText style={styles.debugText} selectable>
                            {debugData.contextUpdate}
                          </RNText>
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {debugData.sentText && (
                    <View
                      style={[
                        styles.debugSection,
                        expandedDebugSections.sentText ? styles.debugSectionExpanded : null,
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => toggleDebugSection('sentText')}
                        style={styles.debugSectionHeader}
                        activeOpacity={0.6}
                      >
                        <RNText style={styles.debugTitle}>
                          Text Sent to AI {expandedDebugSections.sentText ? '▼' : '▶'}
                        </RNText>
                      </TouchableOpacity>
                      {expandedDebugSections.sentText && (
                        <ScrollView style={styles.debugTextContainer} nestedScrollEnabled>
                          <RNText style={styles.debugText} selectable>
                            {debugData.sentText}
                          </RNText>
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {debugData.reply && (
                    <View
                      style={[
                        styles.debugSection,
                        expandedDebugSections.aiReply ? styles.debugSectionExpanded : null,
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => toggleDebugSection('aiReply')}
                        style={styles.debugSectionHeader}
                        activeOpacity={0.6}
                      >
                        <RNText style={styles.debugTitle}>
                          AI Reply {expandedDebugSections.aiReply ? '▼' : '▶'}
                        </RNText>
                      </TouchableOpacity>
                      {expandedDebugSections.aiReply && (
                        <ScrollView style={styles.debugTextContainer} nestedScrollEnabled>
                          <RNText style={styles.debugText} selectable>
                            {debugData.reply}
                          </RNText>
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {debugData.tokenUsage && (
                    <View
                      style={[
                        styles.debugSection,
                        expandedDebugSections.tokenUsage ? styles.debugSectionExpanded : null,
                      ]}
                    >
                      <RNText style={styles.debugTitle}>Token Usage:</RNText>
                      <RNText style={styles.debugText} selectable>
                        Total: {debugData.tokenUsage.totalTokens?.toLocaleString() || 'N/A'}
                        {debugData.tokenUsage.inputTokens &&
                          debugData.tokenUsage.outputTokens && (
                            <>
                              {' '}
                              (Input: {debugData.tokenUsage.inputTokens.toLocaleString()}, Output:{' '}
                              {debugData.tokenUsage.outputTokens.toLocaleString()})
                            </>
                          )}
                      </RNText>

                      {(debugData.costUsd ?? debugData.cost) !== undefined && (
                        <RNText style={styles.debugText} selectable>
                          Estimated cost: $
                          {Number(debugData.costUsd ?? debugData.cost).toFixed(6)}
                        </RNText>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Review Dialog */}
      {selectedExtraction && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <RNText style={fzText.title}>Review AI Extraction</RNText>
            <View style={styles.dialogDivider} />

            <View style={styles.relationRow}>
              <RNText style={styles.subjectName}>{selectedExtraction.subjectName}</RNText>
              <RNText style={styles.relationType}>{selectedExtraction.relationType}</RNText>
              <RNText style={styles.objectLabel}>{selectedExtraction.objectLabel}</RNText>
            </View>

            <RNText style={styles.confidence}>
              AI Confidence: {((selectedExtraction.confidence || 0) * 100).toFixed(0)}%
            </RNText>

            {selectedExtraction.extractionReason && (
              <RNText style={styles.reason}>{selectedExtraction.extractionReason}</RNText>
            )}

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogBtnOutline}
                onPress={() => setSelectedExtraction(null)}
                activeOpacity={0.7}
              >
                <RNText style={fzText.btnOutline}>Cancel</RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtnOutline, { borderColor: fz.ink }]}
                onPress={() => handleRejectExtraction(selectedExtraction.id)}
                disabled={rejectExtraction.isPending}
                activeOpacity={0.7}
              >
                <RNText style={[fzText.btnOutline, { color: fz.ink }]}>
                  {rejectExtraction.isPending ? '...' : 'Reject'}
                </RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogBtnSolid}
                onPress={() => handleApproveExtraction(selectedExtraction.id)}
                disabled={approveExtraction.isPending}
                activeOpacity={0.7}
              >
                <RNText style={fzText.btn}>
                  {approveExtraction.isPending ? '...' : 'Approve'}
                </RNText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fz.paper },
  appBar: { backgroundColor: fz.paper, paddingBottom: fz.s.sm },
  appBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: fz.s.edge,
    paddingBottom: fz.s.sm,
  },
  scroll: { flex: 1 },
  scrollInner: { padding: fz.s.edge, paddingTop: fz.s.md },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  primaryBtn: {
    backgroundColor: fz.ink,
    height: 48,
    borderRadius: fz.rButton,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: fz.card,
    borderRadius: fz.rCard,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    padding: fz.s.lg,
    marginBottom: fz.s.md,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: fz.s.sm },
  metaLabel: { marginRight: fz.s.md, width: 90 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: fz.s.sm },
  divider: { height: 1, backgroundColor: fz.hairline, marginVertical: fz.s.md },
  storyText: { ...fzText.body, lineHeight: 24, color: fz.ink },
  apiKeyWarning: {
    ...fzText.sub,
    marginTop: fz.s.sm,
    color: fz.textMute,
    fontStyle: 'italic',
  },
  extractionItem: {
    borderLeftWidth: 3,
    borderLeftColor: fz.line,
    paddingLeft: fz.s.md,
    marginBottom: fz.s.md,
    backgroundColor: fz.surfaceSoft,
    borderRadius: fz.rRow,
    padding: fz.s.md,
  },
  relationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: fz.s.sm,
    flexWrap: 'wrap',
    gap: fz.s.sm,
  },
  subjectName: { ...fzText.name, marginRight: fz.s.sm },
  relationType: {
    ...fzText.chip,
    backgroundColor: fz.surface,
    paddingHorizontal: fz.s.sm,
    paddingVertical: 2,
    borderRadius: fz.rPill,
    overflow: 'hidden',
  },
  objectLabel: { ...fzText.body, color: fz.ink },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  confidence: { ...fzText.time, color: fz.textMute },
  reason: { ...fzText.time, color: fz.textMute, fontStyle: 'italic', marginTop: 4 },
  warning: { ...fzText.sub, marginTop: fz.s.md, color: fz.textMute, fontStyle: 'italic' },
  // Dialog
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: fz.card,
    borderRadius: fz.rCard,
    padding: fz.s.lg,
    width: '100%',
    maxWidth: 400,
  },
  dialogDivider: { height: 1, backgroundColor: fz.hairline, marginVertical: fz.s.md },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: fz.s.lg,
    gap: fz.s.sm,
  },
  dialogBtnOutline: {
    flex: 1,
    height: 44,
    borderRadius: fz.rButton,
    borderWidth: 1.5,
    borderColor: fz.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBtnSolid: {
    flex: 1,
    height: 44,
    borderRadius: fz.rButton,
    backgroundColor: fz.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Debug
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugToggle: { ...fzText.label, color: fz.textMute },
  debugSection: { marginBottom: fz.s.sm },
  debugSectionExpanded: { marginBottom: fz.s.lg },
  debugSectionHeader: {
    padding: fz.s.md,
    backgroundColor: fz.surface,
    borderRadius: fz.rRow,
    marginBottom: fz.s.sm,
  },
  debugTitle: { ...fzText.label, color: fz.textBody },
  debugTextContainer: {
    backgroundColor: fz.surfaceSoft,
    borderRadius: fz.rRow,
    padding: fz.s.md,
    maxHeight: 300,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: fz.textBody,
    lineHeight: 16,
  },
});