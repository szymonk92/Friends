import { eq } from 'drizzle-orm';
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

    // eslint-disable-next-line no-console
    console.log('✅ Sample data seeded successfully!');
    // eslint-disable-next-line no-console
    console.log(`- Created 3 people: Emma, Mike, Sarah`);
    // eslint-disable-next-line no-console
    console.log(`- Created ${4 + 2 + 2} relations`);
    // eslint-disable-next-line no-console
    console.log(`- Created 1 story`);

    return { emma, mike, sarah };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to seed sample data:', error);
    throw error;
  }
}

/**
 * Clear all data from the database (for testing)
 * WARNING: This will delete ALL data!
 */
export async function clearAllData() {
  try {
    const userId = await getCurrentUserId();

    // Delete in correct order (due to foreign keys)
    await db.delete(relations).where(eq(relations.userId, userId));
    await db.delete(stories).where(eq(stories.userId, userId));
    await db.delete(people).where(eq(people.userId, userId));

    // eslint-disable-next-line no-console
    console.log('✅ All data cleared successfully!');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to clear data:', error);
    throw error;
  }
}
