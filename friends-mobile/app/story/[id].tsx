import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { confirmDestructive, fzAlert } from '@/lib/utils/confirm';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { db, getCurrentUserId } from '@/lib/db';
import { stories, pendingExtractions, people, relations } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { activePeople } from '@/lib/db/filters';
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
import { AppBar } from '@/components/AppBar';
import { IconCircle } from '@/components/IconCircle';
import { relationTypeLabel } from '@/lib/i18n/labels';
import { Pill } from '@/components/Pill';
import { useTranslation } from 'react-i18next';

export default function StoryDetailScreen() {
  const { t } = useTranslation();
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
      fzAlert(
        t('addStory.keyRequiredTitle'),
        t('storyDetail.configureKey', { model: modelName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('addStory.goToSettings'), onPress: () => router.push('/settings') },
        ]
      );
      return;
    }

    fzAlert(
      t('storyDetail.extractTitle'),
      t('storyDetail.extractMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('storyDetail.extract'),
          onPress: async () => {
            try {
              // Prepare all debug data upfront
              const systemPrompt = createSystemPrompt();
              const userId = await getCurrentUserId();
              const existingPeople = await db
                .select({ id: people.id, name: people.name })
                .from(people)
                .where(activePeople(userId));

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
              fzAlert(
                t('storyDetail.completeTitle'),
                t('storyDetail.completeMessage', {
                  newPeople: result.newPeople,
                  accepted: result.autoAcceptedRelations,
                  pending: result.pendingRelations,
                  conflicts: result.conflicts,
                  tokens: result.tokensUsed,
                  ms: result.processingTime,
                })
              );
            } catch (error) {
              fzAlert(
                t('addStory.extractionFailedTitle'),
                error instanceof Error ? error.message : t('common.unknownError')
              );
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    const hasExtractions = extractions.length > 0 || story?.aiProcessed;

    confirmDestructive({
      title: t('storiesList.deleteTitle'),
      message: hasExtractions
        ? t('storiesList.deleteMessageAi')
        : t('storiesList.deleteMessage'),
      onConfirm: async () => {
        try {
          await deleteStory.mutateAsync(id!);
          fzAlert(t('common.success'), t('storiesList.deleted'));
          router.back();
        } catch (err) {
          fzAlert(t('common.error'), t('storiesList.deleteFailed'));
        }
      },
    });
  };

  const handleApproveExtraction = async (extractionId: string) => {
    try {
      // Prevent double-clicking
      if (approveExtraction.isPending) return;

      await approveExtraction.mutateAsync(extractionId);
      setSelectedExtraction(null);
      refetch();
      fzAlert(t('common.success'), t('storyDetail.approved'));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('storyDetail.approveFailed');
      fzAlert(t('common.error'), errorMessage);
    }
  };

  const handleRejectExtraction = async (extractionId: string) => {
    try {
      await rejectExtraction.mutateAsync({ extractionId });
      setSelectedExtraction(null);
      refetch();
      fzAlert(t('common.success'), t('storyDetail.rejected'));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('storyDetail.rejectFailed');
      fzAlert(t('common.error'), errorMessage);
    }
  };

  const actions = (
    <>
      <IconCircle icon="pencil" onPress={() => router.push(`/story/addStory?storyId=${id}`)} />
      <IconCircle icon="trash" onPress={handleDelete} />
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <AppBar title={t('storyDetail.story')} right={actions} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={fz.ink} />
        </View>
      </View>
    );
  }

  if (!story) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />
        <AppBar title={t('storyDetail.notFoundTitle')} right={actions} />
        <View style={styles.centered}>
          <RNText style={fzText.sub}>{t('storyDetail.notFound')}</RNText>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <RNText style={fzText.btn}>{t('person.goBack')}</RNText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const wordCount = story.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={fz.paper} translucent />

      <AppBar title={story.title || t('storyDetail.details')} right={actions} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        {/* Story Metadata */}
        <View style={styles.card}>
          <View style={styles.metaRow}>
            <RNText style={[fzText.label, styles.metaLabel]}>{t('storyDetail.created')}</RNText>
            <RNText style={fzText.sub}>{formatRelativeTime(new Date(story.createdAt))}</RNText>
          </View>

          {story.storyDate && (
            <View style={styles.metaRow}>
              <RNText style={[fzText.label, styles.metaLabel]}>{t('storyDetail.eventDate')}</RNText>
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
            <Pill label={t('storiesList.words', { count: wordCount })} icon="book" />
            {story.aiProcessed && <Pill label={t('storiesList.aiProcessed')} icon="checkCircle" />}
          </View>
        </View>

        {/* AI Extraction Action */}
        {!story.aiProcessed && (
          <View style={styles.card}>
            <RNText style={fzText.title}>{t('storyDetail.aiAnalysis')}</RNText>
            <View style={styles.divider} />
            {pendingCount > 0 ? (
              <>
                <RNText style={[fzText.body, { marginBottom: fz.s.md }]}>
                  {t('storyDetail.pendingWaiting', { count: pendingCount })}
                </RNText>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => router.push('/review-extractions')}
                  activeOpacity={0.8}
                >
                  <RNText style={fzText.btn}>{t('storyDetail.reviewNow', { count: pendingCount })}</RNText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <RNText style={[fzText.body, { marginBottom: fz.s.md }]}>
                  {t('storyDetail.useAi')}
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
                    {extractRelations.isPending ? t('storyDetail.extracting') : t('storyDetail.extractTitle')}
                  </RNText>
                </TouchableOpacity>
                {!hasActiveApiKey() && (
                  <RNText style={styles.apiKeyWarning}>
                    {t('storyDetail.keyNote', { model: AI_MODELS[selectedModel]?.name })}
                  </RNText>
                )}
              </>
            )}
          </View>
        )}

        {/* Story Content */}
        <View style={styles.card}>
          <RNText style={fzText.title}>{t('storyDetail.content')}</RNText>
          <View style={styles.divider} />
          <RNText style={styles.storyText}>{story.content}</RNText>
        </View>

        {/* AI Extraction Info */}
        {story.aiProcessed && (
          <View style={styles.card}>
            <RNText style={fzText.title}>{t('storyDetail.extractedTitle')}</RNText>
            <View style={styles.divider} />

            {extractions.length > 0 ? (
              <View>
                <RNText style={[fzText.body, { marginBottom: fz.s.md }]}>
                  {t('storyDetail.extractedCount', { count: extractions.length })}
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
                        <RNText style={styles.relationType}>{relationTypeLabel(ext.relationType)}</RNText>
                        <RNText style={styles.objectLabel}>{ext.objectLabel}</RNText>
                      </View>
                      <View style={styles.metadataRow}>
                        <Pill label={t('storyDetail.status.pending')} variant="outline" />
                        <RNText style={styles.confidence}>
                          {t('brainDump.confidence', { percent: ((ext.confidence || 0) * 100).toFixed(0) })}
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
                        <RNText style={styles.relationType}>{relationTypeLabel(ext.relationType)}</RNText>
                        <RNText style={styles.objectLabel}>{ext.objectLabel}</RNText>
                      </View>
                      <View style={styles.metadataRow}>
                        <Pill
                          label={t(`storyDetail.status.${ext.reviewStatus as 'pending' | 'approved' | 'rejected'}`, { defaultValue: ext.reviewStatus })}
                          variant="outline"
                        />
                        <RNText style={styles.confidence}>
                          {t('brainDump.confidence', { percent: ((ext.confidence || 0) * 100).toFixed(0) })}
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
                {t('storyDetail.noDetails')}
              </RNText>
            )}

            <RNText style={styles.warning}>
              {t('storyDetail.deleteNote')}
            </RNText>
          </View>
        )}

        {/* Debug Information */}
        <View style={styles.card}>
          <View style={styles.debugHeader}>
            <RNText style={fzText.title}>{t('storyDetail.dbgTitle')}</RNText>
            <TouchableOpacity
              onPress={() => setShowDebugInfo(!showDebugInfo)}
              activeOpacity={0.6}
              hitSlop={8}
            >
              <RNText style={styles.debugToggle}>
                {showDebugInfo ? t('storyDetail.dbgHide') : t('storyDetail.dbgShow')}
              </RNText>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          {showDebugInfo && (
            <View>
              {!debugData ? (
                <View style={styles.debugSection}>
                  <RNText style={styles.debugTitle}>{t('storyDetail.dbgNone')}</RNText>
                  <RNText style={styles.debugText}>
                    {t('storyDetail.dbgNoneMessage')}
                  </RNText>
                  <RNText style={styles.debugText}>
                    {t('storyDetail.dbgStatus', { value: story.aiProcessed ? t('storyDetail.yes') : t('storyDetail.no') })}
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
                          {t('storyDetail.dbgSystem')} {expandedDebugSections.systemPrompt ? '▼' : '▶'}
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
                          {t('storyDetail.dbgContext')} {expandedDebugSections.contextUpdate ? '▼' : '▶'}
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
                          {t('storyDetail.dbgSent')} {expandedDebugSections.sentText ? '▼' : '▶'}
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
                          {t('storyDetail.dbgReply')} {expandedDebugSections.aiReply ? '▼' : '▶'}
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
                      <RNText style={styles.debugTitle}>{t('storyDetail.dbgTokens')}</RNText>
                      <RNText style={styles.debugText} selectable>
                        {t('storyDetail.dbgTotal')} {debugData.tokenUsage.totalTokens?.toLocaleString() || 'N/A'}
                        {debugData.tokenUsage.inputTokens &&
                          debugData.tokenUsage.outputTokens && (
                            <>
                              {' '}
                              ({t('storyDetail.dbgInput')} {debugData.tokenUsage.inputTokens.toLocaleString()}, {t('storyDetail.dbgOutput')}{' '}
                              {debugData.tokenUsage.outputTokens.toLocaleString()})
                            </>
                          )}
                      </RNText>

                      {(debugData.costUsd ?? debugData.cost) !== undefined && (
                        <RNText style={styles.debugText} selectable>
                          {t('storyDetail.dbgCost')} $
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
            <RNText style={fzText.title}>{t('storyDetail.reviewTitle')}</RNText>
            <View style={styles.dialogDivider} />

            <View style={styles.relationRow}>
              <RNText style={styles.subjectName}>{selectedExtraction.subjectName}</RNText>
              <RNText style={styles.relationType}>{relationTypeLabel(selectedExtraction.relationType)}</RNText>
              <RNText style={styles.objectLabel}>{selectedExtraction.objectLabel}</RNText>
            </View>

            <RNText style={styles.confidence}>
              {t('storyDetail.aiConfidence', { percent: ((selectedExtraction.confidence || 0) * 100).toFixed(0) })}
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
                <RNText style={fzText.btnOutline}>{t('common.cancel')}</RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtnOutline, { borderColor: fz.ink }]}
                onPress={() => handleRejectExtraction(selectedExtraction.id)}
                disabled={rejectExtraction.isPending}
                activeOpacity={0.7}
              >
                <RNText style={[fzText.btnOutline, { color: fz.ink }]}>
                  {rejectExtraction.isPending ? '...' : t('storyDetail.reject')}
                </RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogBtnSolid}
                onPress={() => handleApproveExtraction(selectedExtraction.id)}
                disabled={approveExtraction.isPending}
                activeOpacity={0.7}
              >
                <RNText style={fzText.btn}>
                  {approveExtraction.isPending ? '...' : t('storyDetail.approve')}
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