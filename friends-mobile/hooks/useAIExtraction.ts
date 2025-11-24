import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, getCurrentUserId } from '@/lib/db';
import { people, relations, stories, pendingExtractions } from '@/lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import {
  extractRelationsFromStorySession,
  shouldAutoAccept,
  type ExtractionResult,
} from '@/lib/ai/extraction';
import { useSettings } from '@/store/useSettings';
import type { AIServiceConfig } from '@/lib/ai/ai-service';

/**
 * Hook to extract relations from a story using AI
 * This is the main integration point between stories and relations
 */
export function useExtractRelations() {
  const queryClient = useQueryClient();
  const { selectedModel, getActiveApiKey } = useSettings();

  return useMutation({
    mutationFn: async (storyId: string) => {
      const apiKey = getActiveApiKey();
      if (!apiKey) {
        throw new Error('AI API key not configured. Please set it in Settings.');
      }

      const config: AIServiceConfig = {
        model: selectedModel,
        apiKey,
      };

      const userId = await getCurrentUserId();

      // 1. Fetch the story
      const storyResults = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
      const story = storyResults[0];

      if (!story) {
        throw new Error('Story not found');
      }

      if (story.aiProcessed) {
        throw new Error('Story already processed by AI');
      }

      // 2. Fetch existing people (lightweight context)
      const existingPeople = await db
        .select({ id: people.id, name: people.name })
        .from(people)
        .where(and(eq(people.userId, userId), isNull(people.deletedAt)));

      // 3. Fetch existing relations for conflict detection
      const existingRelations = await db
        .select({
          relationType: relations.relationType,
          objectLabel: relations.objectLabel,
          subjectId: relations.subjectId,
        })
        .from(relations)
        .where(and(eq(relations.userId, userId), isNull(relations.deletedAt)));

      // Add subject names to existing relations
      const relationsWithNames = existingRelations.map((rel) => {
        const person = existingPeople.find((p) => p.id === rel.subjectId);
        return {
          ...rel,
          subjectName: person?.name || 'Unknown',
        };
      });

      // 4. Call AI extraction service (session-based)
      const result = await extractRelationsFromStorySession(
        story.content,
        existingPeople,
        config,
        relationsWithNames
      );

      // 5. Process results
      const processedResults = await processExtractionResults(userId, storyId, result, result.rawResponse);

      // 6. Mark story as processed
      await db
        .update(stories)
        .set({
          aiProcessed: true,
          aiProcessedAt: new Date(),
          extractedData: JSON.stringify(result),
          updatedAt: new Date(),
        })
        .where(eq(stories.id, storyId));

      return processedResults;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['relations'] });
      queryClient.invalidateQueries({ queryKey: ['pendingExtractions'] });
    },
  });
}

interface ProcessedResults {
  newPeople: number;
  autoAcceptedRelations: number;
  pendingRelations: number;
  conflicts: number;
  tokensUsed: number;
  processingTime: number;
  rawResponse?: string;
}

/**
 * Process extraction results: create people, auto-accept relations, queue pending
 */
async function processExtractionResults(
  userId: string,
  storyId: string,
  result: ExtractionResult,
  rawResponse?: string
): Promise<ProcessedResults> {
  let newPeopleCount = 0;
  let autoAcceptedCount = 0;
  let pendingCount = 0;

  // 1. Create new people
  const personIdMap = new Map<string, string>(); // temp ID -> actual ID

  for (const person of result.people) {
    if (person.isNew) {
      const newId = randomUUID();
      await db.insert(people).values({
        id: newId,
        userId,
        name: person.name,
        personType: person.personType,
        addedBy: 'ai_extraction',
        mentionCount: 1,
        extractionContext: `Extracted from story ${storyId}`,
        potentialDuplicates: person.potentialDuplicateOf
          ? JSON.stringify([person.potentialDuplicateOf])
          : null,
      });
      personIdMap.set(person.id, newId);
      newPeopleCount++;
    } else {
      // Increment mention count for existing person
      await db
        .update(people)
        .set({
          mentionCount: sql`mention_count + 1` as any,
          updatedAt: new Date(),
        })
        .where(eq(people.id, person.id));
      personIdMap.set(person.id, person.id);
    }
  }

  // 2. Process relations
  for (const relation of result.relations) {
    const actualSubjectId = personIdMap.get(relation.subjectId) || relation.subjectId;

    if (shouldAutoAccept(relation)) {
      // Auto-accept high confidence relations
      await db.insert(relations).values({
        id: randomUUID(),
        userId,
        subjectId: actualSubjectId,
        relationType: relation.relationType as any,
        objectLabel: relation.objectLabel,
        objectType: relation.objectType,
        intensity: relation.intensity,
        confidence: relation.confidence,
        category: relation.category,
        metadata: relation.metadata ? JSON.stringify(relation.metadata) : null,
        status: relation.status || 'current',
        source: 'ai_extraction',
      });
      autoAcceptedCount++;
    } else {
      // Queue for user review
      await db.insert(pendingExtractions).values({
        id: randomUUID(),
        userId,
        storyId,
        subjectId: actualSubjectId,
        subjectName: relation.subjectName,
        relationType: relation.relationType,
        objectLabel: relation.objectLabel,
        objectType: relation.objectType,
        intensity: relation.intensity,
        confidence: relation.confidence,
        category: relation.category,
        metadata: relation.metadata ? JSON.stringify(relation.metadata) : null,
        status: relation.status || 'current',
        reviewStatus: 'pending',
        extractionReason: `Confidence: ${relation.confidence}, requires manual review`,
      });
      pendingCount++;
    }
  }

  return {
    newPeople: newPeopleCount,
    autoAcceptedRelations: autoAcceptedCount,
    pendingRelations: pendingCount,
    conflicts: result.conflicts.length,
    tokensUsed: result.tokensUsed || 0,
    processingTime: result.processingTime || 0,
    rawResponse,
  };
}

/**
 * Hook to fetch pending extractions for review
 */
export function usePendingExtractions() {
  return useMutation({
    mutationFn: async () => {
      const userId = await getCurrentUserId();
      return db
        .select()
        .from(pendingExtractions)
        .where(
          and(eq(pendingExtractions.userId, userId), eq(pendingExtractions.reviewStatus, 'pending'))
        );
    },
  });
}

/**
 * Hook to approve a pending extraction
 */
export function useApprovePendingExtraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (extractionId: string) => {
      const userId = await getCurrentUserId();

      // Fetch the pending extraction
      const pending = await db
        .select()
        .from(pendingExtractions)
        .where(eq(pendingExtractions.id, extractionId))
        .limit(1);

      if (!pending[0]) {
        throw new Error('Pending extraction not found');
      }

      const extraction = pending[0];

      // Create the relation
      await db.insert(relations).values({
        id: randomUUID(),
        userId,
        subjectId: extraction.subjectId,
        relationType: extraction.relationType as any,
        objectLabel: extraction.objectLabel,
        objectType: extraction.objectType,
        intensity: extraction.intensity as any,
        confidence: extraction.confidence,
        category: extraction.category,
        metadata: extraction.metadata,
        status: (extraction.status as any) || 'current',
        source: 'ai_extraction',
      });

      // Mark as approved
      await db
        .update(pendingExtractions)
        .set({
          reviewStatus: 'approved',
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pendingExtractions.id, extractionId));

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingExtractions'] });
      queryClient.invalidateQueries({ queryKey: ['relations'] });
    },
  });
}

/**
 * Hook to reject a pending extraction
 */
export function useRejectPendingExtraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ extractionId, reason }: { extractionId: string; reason?: string }) => {
      await db
        .update(pendingExtractions)
        .set({
          reviewStatus: 'rejected',
          reviewedAt: new Date(),
          reviewNotes: reason,
          updatedAt: new Date(),
        })
        .where(eq(pendingExtractions.id, extractionId));

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingExtractions'] });
    },
  });
}
