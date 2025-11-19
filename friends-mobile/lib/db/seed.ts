import { eq, and, inArray } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { db, getCurrentUserId } from './index';
import { people, relations, stories } from './schema';

/**
 * Seed the database with sample data for testing
 * WARNING: This will add sample data to your database!
 */
export async function seedSampleData() {
  try {
    const userId = await getCurrentUserId();

    // Create sample people
    const [emma] = (await db
      .insert(people)
      .values({
        id: randomUUID(),
        userId,
        name: 'Emma Rodriguez',
        nickname: 'Em',
        relationshipType: 'friend',
        personType: 'primary',
        dataCompleteness: 'complete',
        addedBy: 'user',
        importanceToUser: 'very_important',
        status: 'active',
        tags: JSON.stringify(['test_data']),
        notes: 'Best friend from college. Software engineer at Google.',
      })
      .returning()) as any[];

    const [mike] = (await db
      .insert(people)
      .values({
        id: randomUUID(),
        userId,
        name: 'Mike Chen',
        relationshipType: 'colleague',
        personType: 'primary',
        dataCompleteness: 'partial',
        addedBy: 'user',
        importanceToUser: 'important',
        status: 'active',
        tags: JSON.stringify(['test_data']),
        notes: 'Works on the backend team.',
      })
      .returning()) as any[];

    const [sarah] = (await db
      .insert(people)
      .values({
        id: randomUUID(),
        userId,
        name: 'Sarah Thompson',
        nickname: 'Sally',
        relationshipType: 'friend',
        personType: 'primary',
        dataCompleteness: 'complete',
        addedBy: 'user',
        importanceToUser: 'important',
        status: 'active',
        tags: JSON.stringify(['test_data']),
      })
      .returning()) as any[];

    // Create sample relations for Emma
    await db.insert(relations).values([
      {
        id: randomUUID(),
        userId,
        subjectId: emma.id,
        subjectType: 'person',
        relationType: 'LIKES',
        objectLabel: 'coffee',
        objectType: 'food',
        category: 'beverage',
        intensity: 'very_strong',
        confidence: 0.95,
        source: 'manual',
        status: 'current',
      },
      {
        id: randomUUID(),
        userId,
        subjectId: emma.id,
        subjectType: 'person',
        relationType: 'IS',
        objectLabel: 'vegan',
        objectType: 'lifestyle',
        category: 'dietary',
        confidence: 1.0,
        source: 'manual',
        status: 'current',
      },
      {
        id: randomUUID(),
        userId,
        subjectId: emma.id,
        subjectType: 'person',
        relationType: 'REGULARLY_DOES',
        objectLabel: 'yoga',
        objectType: 'activity',
        category: 'exercise',
        intensity: 'strong',
        confidence: 0.9,
        source: 'manual',
        status: 'current',
      },
      {
        id: randomUUID(),
        userId,
        subjectId: emma.id,
        subjectType: 'person',
        relationType: 'WORKS_AT',
        objectLabel: 'Google',
        objectType: 'organization',
        category: 'employment',
        confidence: 1.0,
        source: 'manual',
        status: 'current',
      },
    ] as any);

    // Create sample relations for Mike
    await db.insert(relations).values([
      {
        id: randomUUID(),
        userId,
        subjectId: mike.id,
        subjectType: 'person',
        relationType: 'HAS_SKILL',
        objectLabel: 'Python',
        objectType: 'skill',
        category: 'programming',
        intensity: 'very_strong',
        confidence: 0.95,
        source: 'manual',
        status: 'current',
      },
      {
        id: randomUUID(),
        userId,
        subjectId: mike.id,
        subjectType: 'person',
        relationType: 'DISLIKES',
        objectLabel: 'meetings',
        objectType: 'activity',
        category: 'work',
        intensity: 'medium',
        confidence: 0.8,
        source: 'manual',
        status: 'current',
      },
    ] as any);

    // Create sample relations for Sarah
    await db.insert(relations).values([
      {
        id: randomUUID(),
        userId,
        subjectId: sarah.id,
        subjectType: 'person',
        relationType: 'LIKES',
        objectLabel: 'hiking',
        objectType: 'activity',
        category: 'outdoor',
        intensity: 'strong',
        confidence: 0.9,
        source: 'manual',
        status: 'current',
      },
      {
        id: randomUUID(),
        userId,
        subjectId: sarah.id,
        subjectType: 'person',
        relationType: 'FEARS',
        objectLabel: 'heights',
        objectType: 'phobia',
        category: 'fear',
        intensity: 'medium',
        confidence: 0.85,
        source: 'manual',
        status: 'current',
        metadata: JSON.stringify({ severity: 'moderate' }),
      },
    ] as any);

    // Create a sample story
    await db.insert(stories).values({
      id: randomUUID(),
      userId,
      title: 'Coffee with Emma',
      content:
        "Had coffee with Emma today at Blue Bottle. She told me she's fully vegan now and loving it. She's also really into yoga these days - goes to classes 4 times a week! We talked about her new role at Google on the search team.",
      aiProcessed: false,
      storyDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    } as any);

    console.log('✅ Sample data seeded successfully!');
    console.log(`- Created 3 people: Emma, Mike, Sarah`);
    console.log(`- Created ${4 + 2 + 2} relations`);
    console.log(`- Created 1 story`);

    return { emma, mike, sarah };
  } catch (error) {
    console.error('❌ Failed to seed sample data:', error);
    throw error;
  }
}

/**
 * Clear test data from the database (only removes test data, not user data)
 * This function safely removes only the sample data created by seedSampleData()
 */
export async function clearTestData() {
  try {
    const userId = await getCurrentUserId();

    // First, get all people with 'test_data' tag
    const allPeople = await db
      .select({ id: people.id, tags: people.tags })
      .from(people)
      .where(eq(people.userId, userId))
      .all();

    // Filter to only test data people (those with test_data tag)
    const testPersonIds = allPeople
      .filter(person => {
        try {
          const tags = person.tags ? JSON.parse(person.tags) : [];
          return tags.includes('test_data');
        } catch {
          return false;
        }
      })
      .map(person => person.id);

    if (testPersonIds.length === 0) {
      console.log('✅ No test data found to clear');
      return;
    }

    // Delete in correct order (due to foreign keys)
    // Delete relations where subject is a test person
    await db.delete(relations).where(
      and(
        eq(relations.userId, userId),
        inArray(relations.subjectId, testPersonIds)
      )
    );

    // Delete stories that mention test people
    const storiesWithTestPeople = await db
      .select({ id: stories.id, peopleIds: stories.peopleIds })
      .from(stories)
      .where(eq(stories.userId, userId))
      .all();

    const storyIdsToDelete = storiesWithTestPeople
      .filter(story => {
        if (!story.peopleIds) return false;
        try {
          const peopleIds = JSON.parse(story.peopleIds);
          return peopleIds.some((id: string) => testPersonIds.includes(id));
        } catch {
          return false;
        }
      })
      .map(story => story.id);

    if (storyIdsToDelete.length > 0) {
      await db.delete(stories).where(inArray(stories.id, storyIdsToDelete));
    }

    // Finally, delete the test people
    await db.delete(people).where(inArray(people.id, testPersonIds));

    console.log(`✅ Test data cleared successfully! Removed ${testPersonIds.length} test people and their associated data`);
  } catch (error) {
    console.error('❌ Failed to clear test data:', error);
    throw error;
  }
}

/**
 * Clear all data from the database (for testing)
 * WARNING: This will delete ALL data!
 * @deprecated Use clearTestData() for safer test data removal
 */
export async function clearAllData() {
  try {
    const userId = await getCurrentUserId();

    // Delete in correct order (due to foreign keys)
    await db.delete(relations).where(eq(relations.userId, userId));
    await db.delete(stories).where(eq(stories.userId, userId));
    await db.delete(people).where(eq(people.userId, userId));

    console.log('✅ All data cleared successfully!');
  } catch (error) {
    console.error('❌ Failed to clear data:', error);
    throw error;
  }
}
