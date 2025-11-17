import { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { db, getCurrentUserId } from '@/lib/db';
import { stories, pendingExtractions } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { useDeleteStory } from '@/hooks/useStories';
import { useExtractRelations } from '@/hooks/useAIExtraction';
import { formatRelativeTime } from '@/lib/utils/format';
import { useSettings } from '@/store/useSettings';

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deleteStory = useDeleteStory();
  const extractRelations = useExtractRelations();
  const { hasApiKey } = useSettings();
  const [extractionResult, setExtractionResult] = useState<any>(null);

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
    if (!hasApiKey()) {
      Alert.alert(
        'API Key Required',
        'Please configure your Anthropic API key in Settings before using AI extraction.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => router.push('/settings') },
        ]
      );
      return;
    }

    Alert.alert(
      'Extract Relations',
      'This will use AI to extract people, preferences, and relationships from your story. This action uses your API key and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Extract',
          onPress: async () => {
            try {
              const result = await extractRelations.mutateAsync(id!);
              setExtractionResult(result);
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
            <Button mode="text" onPress={handleDelete} textColor="#d32f2f" compact>
              Delete
            </Button>
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
              {!hasApiKey() && (
                <Text variant="labelSmall" style={styles.apiKeyWarning}>
                  Note: API key required. Configure in Settings.
                </Text>
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
                AI Extraction Info
              </Text>
              <Divider style={styles.divider} />

              {extractions.length > 0 ? (
                <View>
                  <Text variant="bodySmall" style={styles.extractionInfo}>
                    {extractions.length} extraction result(s) from this story
                  </Text>
                  {extractions.map((ext) => (
                    <View key={ext.id} style={styles.extractionItem}>
                      <Text variant="labelSmall">
                        Status: {ext.status} • Confidence: {((ext.confidence || 0) * 100).toFixed(0)}%
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text variant="bodySmall" style={styles.extractionInfo}>
                  This story was processed by AI but extraction details are not available.
                </Text>
              )}

              <Text variant="labelSmall" style={styles.warning}>
                Note: Deleting this story will NOT remove any extracted people, relations, or information.
              </Text>
            </Card.Content>
          </Card>
        )}

        <View style={styles.spacer} />
      </ScrollView>
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
    marginBottom: 4,
  },
  warning: {
    marginTop: 12,
    color: '#ff9800',
    fontStyle: 'italic',
  },
  spacer: {
    height: 40,
  },
});
