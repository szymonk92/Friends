import { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { db, getCurrentUserId } from '@/lib/db';
import { stories, pendingExtractions, people, relations } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { useDeleteStory } from '@/hooks/useStories';
import { useExtractRelations } from '@/hooks/useAIExtraction';
import { useApprovePendingExtraction, useRejectPendingExtraction, usePendingExtractionsCount } from '@/hooks/usePendingExtractions';
import { createSystemPrompt } from '@/lib/ai/prompts';
import { formatRelativeTime } from '@/lib/utils/format';
import { useSettings, AI_MODELS } from '@/store/useSettings';

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deleteStory = useDeleteStory();
  const extractRelations = useExtractRelations();
  const approveExtraction = useApprovePendingExtraction();
  const rejectExtraction = useRejectPendingExtraction();
  const { hasActiveApiKey, selectedModel } = useSettings();
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [selectedExtraction, setSelectedExtraction] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugData, setDebugData] = useState<{
    systemPrompt?: string;
    sentText?: string;
    reply?: string;
    tokenUsage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    sentData?: any;
    receivedData?: any;
    conflictsCount?: number;
  } | null>(null);

  // Check for pending extractions across all stories
  const { data: pendingCount = 0 } = usePendingExtractionsCount();

  const { data: story, isLoading, refetch } = useQuery({
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
                  ? existingPeople.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')
                  : 'None yet'
              }\n\nEXISTING RELATIONS:\n${
                existingRelations.length > 0
                  ? existingRelations.map(r => `- ${existingPeople.find(p => p.id === r.subjectId)?.name || 'Unknown'}: ${r.relationType} "${r.objectLabel}"`).join('\n')
                  : 'None yet'
              }`;

              const sentText = `EXTRACT RELATIONS FROM THIS STORY:\n\n"${story?.content}"\n\nPlease analyze this story and extract people, their relationships, and any conflicts with existing data. Respond with JSON only.`;

              // Run the extraction
              const result = await extractRelations.mutateAsync(id!);
              setExtractionResult(result);

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
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve relation. Please try again.';
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject relation. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Story' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (!story) {
    return (
      <>
        <Stack.Screen options={{ title: 'Story Not Found' }} />
        <View style={styles.centered}>
          <Text variant="bodyLarge">Story not found</Text>
          <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
            Go Back
          </Button>
        </View>
      </>
    );
  }

  const wordCount = story.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <>
      <Stack.Screen
        options={{
          title: story.title || 'Story Details',
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
              <Button mode="text" onPress={handleDelete} textColor="#d32f2f" compact>
                Delete
              </Button>
            </View>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        {/* Story Metadata */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.metaRow}>
              <Text variant="labelMedium" style={styles.metaLabel}>
                Created:
              </Text>
              <Text variant="bodyMedium">
                {formatRelativeTime(new Date(story.createdAt))}
              </Text>
            </View>

            {story.storyDate && (
              <View style={styles.metaRow}>
                <Text variant="labelMedium" style={styles.metaLabel}>
                  Event Date:
                </Text>
                <Text variant="bodyMedium">
                  {new Date(story.storyDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}

            <View style={styles.chipRow}>
              <Chip icon="text" compact style={styles.chip}>
                {wordCount} words
              </Chip>
              {story.aiProcessed && (
                <Chip icon="robot" compact style={styles.chip}>
                  AI Processed
                </Chip>
              )}
            </View>

            {/* Temporarily show debug button for testing */}
            {true && (
              <Button
                mode="outlined"
                icon="bug"
                onPress={() => setShowDebugInfo(!showDebugInfo)}
                style={styles.debugButton}
              >
                {showDebugInfo ? 'Hide' : 'Show'} Debug Info
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* AI Extraction Action */}
        {!story.aiProcessed && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                AI Analysis
              </Text>
              <Divider style={styles.divider} />
              {pendingCount > 0 ? (
                <>
                  <Text variant="bodySmall" style={styles.extractionDescription}>
                    You have {pendingCount} pending extraction{pendingCount !== 1 ? 's' : ''} waiting for review from previous stories.
                  </Text>
                  <Button
                    mode="contained"
                    icon="clipboard-check"
                    onPress={() => router.push('/review-extractions')}
                    style={styles.extractButton}
                  >
                    Review Now ({pendingCount})
                  </Button>
                </>
              ) : (
                <>
                  <Text variant="bodySmall" style={styles.extractionDescription}>
                    Use AI to automatically extract people, preferences, and relationships from this story.
                    The AI will identify @mentions, detect likes/dislikes, and create connections.
                  </Text>
                  <Button
                    mode="contained"
                    icon="robot"
                    onPress={handleExtractRelations}
                    loading={extractRelations.isPending}
                    disabled={extractRelations.isPending}
                    style={styles.extractButton}
                  >
                    {extractRelations.isPending ? 'Extracting...' : 'Extract Relations'}
                  </Button>
                  {!hasActiveApiKey() && (
                    <Text variant="labelSmall" style={styles.apiKeyWarning}>
                      Note: API key required for {AI_MODELS[selectedModel]?.name}. Configure in Settings.
                    </Text>
                  )}
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Story Content */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Story Content
            </Text>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium" style={styles.storyText}>
              {story.content}
            </Text>
          </Card.Content>
        </Card>

        {/* AI Extraction Info */}
        {story.aiProcessed && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                AI Extracted Relations
              </Text>
              <Divider style={styles.divider} />

              {extractions.length > 0 ? (
                <View>
                  <Text variant="bodySmall" style={styles.extractionInfo}>
                    {extractions.length} relation{extractions.length !== 1 ? 's' : ''} extracted from this story:
                  </Text>
                  {extractions.map((ext) => (
                    ext.reviewStatus === 'pending' ? (
                      <TouchableOpacity
                        key={ext.id}
                        style={styles.extractionItem}
                        onPress={() => setSelectedExtraction(ext)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.relationRow}>
                          <Text variant="bodyMedium" style={styles.subjectName}>
                            {ext.subjectName}
                          </Text>
                          <Text variant="bodySmall" style={styles.relationType}>
                            {ext.relationType}
                          </Text>
                          <Text variant="bodyMedium" style={styles.objectLabel}>
                            {ext.objectLabel}
                          </Text>
                        </View>
                        <View style={styles.metadataRow}>
                          <Chip
                            mode="outlined"
                            compact
                            style={styles.pendingChip}
                          >
                            pending
                          </Chip>
                          <Text variant="labelSmall" style={styles.confidence}>
                            {((ext.confidence || 0) * 100).toFixed(0)}% confidence
                          </Text>
                        </View>
                        {ext.extractionReason && (
                          <Text variant="labelSmall" style={styles.reason}>
                            {ext.extractionReason}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View key={ext.id} style={styles.extractionItem}>
                        <View style={styles.relationRow}>
                          <Text variant="bodyMedium" style={styles.subjectName}>
                            {ext.subjectName}
                          </Text>
                          <Text variant="bodySmall" style={styles.relationType}>
                            {ext.relationType}
                          </Text>
                          <Text variant="bodyMedium" style={styles.objectLabel}>
                            {ext.objectLabel}
                          </Text>
                        </View>
                        <View style={styles.metadataRow}>
                          <Chip
                            mode="outlined"
                            compact
                            style={[
                              styles.statusChip,
                              ext.reviewStatus === 'approved' && styles.approvedChip,
                              ext.reviewStatus === 'rejected' && styles.rejectedChip,
                              ext.reviewStatus === 'edited' && styles.approvedChip,
                            ]}
                          >
                            {ext.reviewStatus}
                          </Chip>
                          <Text variant="labelSmall" style={styles.confidence}>
                            {((ext.confidence || 0) * 100).toFixed(0)}% confidence
                          </Text>
                        </View>
                        {ext.extractionReason && (
                          <Text variant="labelSmall" style={styles.reason}>
                            {ext.extractionReason}
                          </Text>
                        )}
                      </View>
                    )
                  ))}
                </View>
              ) : (
                <Text variant="bodySmall" style={styles.extractionInfo}>
                  This story was processed by AI but no extraction details are available.
                </Text>
              )}

              <Text variant="labelSmall" style={styles.warning}>
                Note: Deleting this story will NOT remove any extracted people, relations, or information.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Debug Information */}
        {showDebugInfo && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.debugHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Debug Information
                </Text>
                <Button
                  mode="text"
                  onPress={() => setShowDebugInfo(!showDebugInfo)}
                  compact
                  style={styles.debugToggle}
                >
                  {showDebugInfo ? 'Hide' : 'Show'} Debug Data
                </Button>
              </View>
              <Divider style={styles.divider} />

              {showDebugInfo && (
                <View>

                  {!debugData ? (
                    <View style={styles.debugSection}>
                      <Text variant="labelMedium" style={styles.debugTitle}>
                        No Debug Data Available
                      </Text>
                      <Text variant="bodySmall" style={styles.debugText}>
                        Debug information is captured during AI extraction. Process this story with AI to see the debug details.
                      </Text>
                      <Text variant="bodySmall" style={styles.debugText}>
                        This story's AI processed status: {story.aiProcessed ? 'Yes' : 'No'}
                      </Text>
                    </View>
                  ) : (
                    <View>
                    {debugData.systemPrompt && (
                        <View style={styles.debugSection}>
                          <Text variant="labelMedium" style={styles.debugTitle}>
                            System Prompt:
                          </Text>
                          <ScrollView horizontal style={styles.debugScroll}>
                            <Text variant="bodySmall" style={styles.debugText}>
                              {debugData.systemPrompt}
                            </Text>
                          </ScrollView>
                        </View>
                      )}

                      {debugData.sentText && (
                        <View style={styles.debugSection}>
                          <Text variant="labelMedium" style={styles.debugTitle}>
                            Text Sent to AI:
                          </Text>
                          <ScrollView horizontal style={styles.debugScroll}>
                            <Text variant="bodySmall" style={styles.debugText}>
                              {debugData.sentText}
                            </Text>
                          </ScrollView>
                        </View>
                      )}

                      {debugData.reply && (
                        <View style={styles.debugSection}>
                          <Text variant="labelMedium" style={styles.debugTitle}>
                            AI Reply:
                          </Text>
                          <ScrollView horizontal style={styles.debugScroll}>
                            <Text variant="bodySmall" style={styles.debugText}>
                              {debugData.reply}
                            </Text>
                          </ScrollView>
                        </View>
                      )}

                      {debugData.tokenUsage && (
                        <View style={styles.debugSection}>
                          <Text variant="labelMedium" style={styles.debugTitle}>
                            Token Usage:
                          </Text>
                          <Text variant="bodySmall" style={styles.debugText}>
                            Total: {debugData.tokenUsage.totalTokens?.toLocaleString() || 'N/A'}
                            {debugData.tokenUsage.inputTokens && debugData.tokenUsage.outputTokens && (
                              <> (Input: {debugData.tokenUsage.inputTokens.toLocaleString()}, Output: {debugData.tokenUsage.outputTokens.toLocaleString()})</>
                            )}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Review Dialog */}
      {selectedExtraction && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text variant="titleMedium" style={styles.dialogTitle}>
              Review AI Extraction
            </Text>
            <Divider style={styles.dialogDivider} />
            
            <View style={styles.relationRow}>
              <Text variant="bodyMedium" style={styles.subjectName}>
                {selectedExtraction.subjectName}
              </Text>
              <Text variant="bodySmall" style={styles.relationType}>
                {selectedExtraction.relationType}
              </Text>
              <Text variant="bodyMedium" style={styles.objectLabel}>
                {selectedExtraction.objectLabel}
              </Text>
            </View>
            
            <Text variant="bodySmall" style={styles.confidence}>
              AI Confidence: {((selectedExtraction.confidence || 0) * 100).toFixed(0)}%
            </Text>
            
            {selectedExtraction.extractionReason && (
              <Text variant="bodySmall" style={styles.reason}>
                {selectedExtraction.extractionReason}
              </Text>
            )}

            <View style={styles.dialogButtons}>
              <Button
                mode="outlined"
                onPress={() => setSelectedExtraction(null)}
                style={styles.dialogButton}
              >
                Cancel
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleRejectExtraction(selectedExtraction.id)}
                textColor="#f44336"
                style={styles.dialogButton}
                loading={rejectExtraction.isPending}
                disabled={rejectExtraction.isPending}
              >
                Reject
              </Button>
              <Button
                mode="contained"
                onPress={() => handleApproveExtraction(selectedExtraction.id)}
                style={styles.dialogButton}
                loading={approveExtraction.isPending}
                disabled={approveExtraction.isPending}
              >
                Approve
              </Button>
            </View>
          </View>
        </View>
      )}
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
  backButton: {
    marginTop: 16,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    fontWeight: 'bold',
    marginRight: 8,
    width: 100,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  storyText: {
    lineHeight: 24,
    color: '#333',
  },
  extractionDescription: {
    opacity: 0.8,
    marginBottom: 16,
    lineHeight: 20,
  },
  extractButton: {
    marginTop: 8,
  },
  apiKeyWarning: {
    marginTop: 8,
    color: '#ff9800',
    fontStyle: 'italic',
  },
  extractionInfo: {
    opacity: 0.7,
    marginBottom: 8,
  },
  extractionItem: {
    paddingVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
    paddingLeft: 8,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  relationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  subjectName: {
    fontWeight: 'bold',
    color: '#1976d2',
    marginRight: 8,
  },
  relationType: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    marginRight: 8,
    fontWeight: '500',
  },
  objectLabel: {
    fontWeight: '500',
    color: '#333',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusChip: {
    height: 32,
    minWidth: 70,
  },
  approvedChip: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  rejectedChip: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  pendingChip: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  confidence: {
    color: '#666',
    fontSize: 11,
  },
  reason: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  dialogTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogDivider: {
    marginBottom: 16,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 8,
  },
  dialogButton: {
    flex: 1,
  },
  warning: {
    marginTop: 12,
    color: '#ff9800',
    fontStyle: 'italic',
  },
  spacer: {
    height: 40,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debugToggle: {
    marginTop: -8,
  },
  debugSection: {
    marginBottom: 16,
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  debugScroll: {
    maxHeight: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#333',
    lineHeight: 16,
  },
  debugButton: {
    marginTop: 12,
    marginBottom: 8,
  },
});
