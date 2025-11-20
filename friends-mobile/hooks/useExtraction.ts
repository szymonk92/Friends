import { useMutation } from '@tanstack/react-query';
import { extractRelationsFromStory, shouldAutoAccept } from '@/lib/ai/extraction';
import { useCreatePerson, useUpdatePerson } from './usePeople';
import { useCreateRelations } from './useRelations';
import { useMarkStoryProcessed } from './useStories';
import { db, getCurrentUserId } from '@/lib/db';
import { people, pendingExtractions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { AIServiceConfig } from '@/lib/ai/ai-service';

interface ExtractionInput {
  storyId: string;
  storyText: string;
  config: AIServiceConfig;
}

interface ExtractionOutput {
  newPeople: any[];
  newRelations: any[];
  pendingReview: number; // Count of relations needing review
  conflicts: any[];
  rawResponse?: string;
  tokensUsed?: number;
}

/**
 * Hook to extract relations from a story using AI
 * This orchestrates the entire extraction flow:
 * 1. Fetch existing people
 * 2. Call AI extraction service
 * 3. Create new people if needed
 * 4. Create relations (auto-accept high confidence ones)
 * 5. Mark story as processed
 */
export function useExtractStory() {
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const createRelations = useCreateRelations();
  const markProcessed = useMarkStoryProcessed();

  return useMutation({
    mutationFn: async ({
      storyId,
      storyText,
      config,
    }: ExtractionInput): Promise<ExtractionOutput> => {
      // Step 1: Get existing people (for lightweight context)
      const userId = await getCurrentUserId();
      const existingPeople = await db
        .select({ id: people.id, name: people.name })
        .from(people)
        .where(eq(people.userId, userId));

      // Step 2: Call AI extraction
      const extractionResult = await extractRelationsFromStory(storyText, existingPeople, config);

      // Step 3: Process extracted people
      const personIdMap = new Map<string, string>(); // Map temp IDs to real IDs
      const newPeopleCreated = [];

      for (const extractedPerson of extractionResult.people) {
        if (extractedPerson.isNew) {
          // Create new person
          const newPerson = await createPerson.mutateAsync({
            name: extractedPerson.name,
            personType: extractedPerson.personType,
            addedBy: 'ai_extraction',
            dataCompleteness: 'minimal',
            status: 'active',
            extractionContext: JSON.stringify({
              storyId,
              confidence: extractedPerson.confidence,
            }),
          });
          personIdMap.set(extractedPerson.id, newPerson.id);
          newPeopleCreated.push(newPerson);
        } else {
          // Use existing person ID
          personIdMap.set(extractedPerson.id, extractedPerson.id);

          // Update mention count
          const existingPerson = await db
            .select()
            .from(people)
            .where(eq(people.id, extractedPerson.id))
            .limit(1);

          if (existingPerson[0]) {
            await updatePerson.mutateAsync({
              id: extractedPerson.id,
              mentionCount: (existingPerson[0].mentionCount || 0) + 1,
            });
          }
        }
      }

      // Step 4: Process relations
      const relationsToCreate: any[] = [];
      const relationsNeedingReview: any[] = [];

      for (const relation of extractionResult.relations) {
        const realSubjectId = personIdMap.get(relation.subjectId);
        if (!realSubjectId) continue;

        const relationData = {
          subjectId: realSubjectId,
          subjectType: 'person' as const,
          relationType: relation.relationType as any,
          objectLabel: relation.objectLabel,
          objectType: relation.objectType,
          intensity: relation.intensity,
          confidence: relation.confidence,
          category: relation.category,
          metadata: relation.metadata ? JSON.stringify(relation.metadata) : undefined,
          status: (relation.status || 'current') as any,
          source: 'ai_extraction' as const,
        };

        // Auto-accept if confidence is high enough
        if (shouldAutoAccept(relation)) {
          relationsToCreate.push(relationData);
        } else {
          relationsNeedingReview.push(relationData);
        }
      }

      // Step 5: Create auto-accepted relations
      let createdRelations = [];
      if (relationsToCreate.length > 0) {
        createdRelations = await createRelations.mutateAsync(relationsToCreate);
      }

      // Step 5.5: Save medium-confidence relations for review
      const pendingCount = relationsNeedingReview.length;
      if (pendingCount > 0) {
        const pendingData = relationsNeedingReview.map((rel) => ({
          userId,
          storyId,
          subjectId: rel.subjectId,
          subjectName: personIdMap.get(rel.subjectId)
            ? extractionResult.people.find((p: any) => personIdMap.get(p.id) === rel.subjectId)
                ?.name || 'Unknown'
            : 'Unknown',
          relationType: rel.relationType,
          objectLabel: rel.objectLabel,
          objectType: rel.objectType || null,
          intensity: rel.intensity || null,
          confidence: rel.confidence,
          category: rel.category || null,
          metadata: rel.metadata ? JSON.stringify(rel.metadata) : null,
          status: rel.status || 'current',
          reviewStatus: 'pending' as const,
          extractionReason: `AI confidence: ${(rel.confidence * 100).toFixed(0)}%`,
        }));

        await db.insert(pendingExtractions).values(pendingData as any);
      }

      // Step 6: Mark story as processed
      await markProcessed.mutateAsync({
        id: storyId,
        extractedData: {
          people: extractionResult.people,
          relations: extractionResult.relations,
          conflicts: extractionResult.conflicts,
          tokensUsed: extractionResult.tokensUsed,
        },
      });

      return {
        newPeople: newPeopleCreated,
        newRelations: createdRelations,
        pendingReview: pendingCount,
        conflicts: extractionResult.conflicts,
        rawResponse: extractionResult.rawResponse,
        tokensUsed: extractionResult.tokensUsed,
      };
    },
  });
}
