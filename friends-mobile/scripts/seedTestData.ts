/**
 * High Load Test Data Generator
 * Creates 500 people with realistic data for performance testing
 */

import { db, getCurrentUserId } from '@/lib/db';
import { people, relations, connections } from '@/lib/db/schema';
import { randomUUID } from 'expo-crypto';

// Sample data pools
const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William',
  'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander',
  'Luna', 'Daniel', 'Ella', 'Michael', 'Elizabeth', 'Sebastian', 'Sofia', 'Jack', 'Emily', 'Owen',
  'Avery', 'Samuel', 'Aria', 'David', 'Scarlett', 'Joseph', 'Chloe', 'Carter', 'Victoria', 'John',
  'Madison', 'Luke', 'Lily', 'Jayden', 'Grace', 'Gabriel', 'Zoey', 'Anthony', 'Penelope', 'Isaac',
  'Riley', 'Dylan', 'Nora', 'Wyatt', 'Layla', 'Andrew', 'Lillian', 'Joshua', 'Ellie', 'Christopher',
  'Camila', 'Grayson', 'Mila', 'Julian', 'Aubrey', 'Mateo', 'Hannah', 'Ryan', 'Brooklyn', 'Aaron',
  'Alice', 'Nathan', 'Addison', 'Ezra', 'Stella', 'Christian', 'Savannah', 'Charles', 'Paisley', 'Elijah',
  'Elena', 'Caleb', 'Audrey', 'Thomas', 'Skylar', 'Adrian', 'Bella', 'Connor', 'Claire', 'Hunter',
  'Lucy', 'Landon', 'Anna', 'Asher', 'Natalie', 'Leo', 'Caroline', 'Theodore', 'Leah', 'Jeremiah',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
];

const DIETS = [
  'vegan', 'vegetarian', 'pescatarian', 'keto', 'paleo', 'gluten-free',
  'lactose-intolerant', 'halal', 'kosher', 'no restrictions', 'organic only',
  'low-carb', 'Mediterranean', 'whole food plant-based', 'flexitarian',
];

const LIKES = [
  'hiking', 'reading', 'cooking', 'photography', 'traveling', 'yoga', 'gaming',
  'music', 'art', 'movies', 'sports', 'gardening', 'dancing', 'writing', 'cycling',
  'swimming', 'running', 'meditation', 'coffee', 'wine', 'craft beer', 'sushi',
  'pizza', 'Thai food', 'Italian cuisine', 'Mexican food', 'BBQ', 'baking',
  'tech gadgets', 'board games', 'podcasts', 'anime', 'sci-fi', 'fantasy books',
  'true crime', 'comedy', 'jazz', 'rock music', 'classical music', 'EDM',
  'camping', 'skiing', 'surfing', 'rock climbing', 'kayaking', 'bird watching',
  'dogs', 'cats', 'plants', 'sustainability', 'minimalism', 'vintage items',
];

const DISLIKES = [
  'crowds', 'small talk', 'loud noises', 'spicy food', 'seafood', 'mushrooms',
  'cilantro', 'early mornings', 'late nights', 'cold weather', 'hot weather',
  'humidity', 'traffic', 'waiting', 'meetings', 'emails', 'phone calls',
  'social media', 'fast food', 'processed food', 'horror movies', 'country music',
  'flying', 'heights', 'snakes', 'spiders', 'conflict', 'gossip', 'dishonesty',
  'tardiness', 'disorganization', 'interruptions', 'negativity', 'drama',
];

const CARES_ABOUT = [
  'family', 'career', 'health', 'education', 'environment', 'social justice',
  'animal welfare', 'mental health', 'work-life balance', 'financial security',
  'personal growth', 'creativity', 'authenticity', 'community', 'spirituality',
  'innovation', 'tradition', 'adventure', 'stability', 'independence',
  'relationships', 'honesty', 'loyalty', 'kindness', 'respect', 'fairness',
];

const JOBS = [
  'Software Engineer', 'Product Manager', 'Designer', 'Teacher', 'Doctor', 'Nurse',
  'Lawyer', 'Accountant', 'Marketing Manager', 'Sales Representative', 'Consultant',
  'Entrepreneur', 'Freelancer', 'Artist', 'Writer', 'Chef', 'Real Estate Agent',
  'Financial Analyst', 'Data Scientist', 'HR Manager', 'Project Manager', 'Architect',
  'Civil Engineer', 'Mechanical Engineer', 'Pharmacist', 'Physical Therapist',
  'Dentist', 'Veterinarian', 'Social Worker', 'Psychologist', 'Journalist',
];

const RELATIONSHIP_TYPES = [
  'friend', 'family', 'colleague', 'acquaintance', 'professional',
];

const IMPORTANCE_LEVELS = ['critical', 'high', 'medium', 'low', 'minimal'];
const COMPLETENESS_LEVELS = ['comprehensive', 'good', 'moderate', 'minimal', 'incomplete'];

// Helper functions
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMultiple<T>(arr: T[], min: number, max: number): T[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function generateBirthday(): Date | null {
  // 70% chance of having a birthday
  if (Math.random() > 0.7) return null;

  const year = 1960 + Math.floor(Math.random() * 45); // 1960-2005
  const month = Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return new Date(year, month, day);
}

function generatePhone(): string | null {
  if (Math.random() > 0.6) return null;
  return `+1${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 900 + 100)}${Math.floor(Math.random() * 9000 + 1000)}`;
}

function generateEmail(firstName: string, lastName: string): string | null {
  if (Math.random() > 0.5) return null;
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
  const num = Math.floor(Math.random() * 100);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${num}@${pickRandom(domains)}`;
}

function generateRelationMetadata() {
  const diet = pickRandom(DIETS);
  const likes = pickMultiple(LIKES, 3, 8);
  const dislikes = pickMultiple(DISLIKES, 2, 5);
  const caresAbout = pickMultiple(CARES_ABOUT, 2, 6);

  return JSON.stringify({
    diet,
    likes,
    dislikes,
    caresAbout,
    allergies: Math.random() > 0.7 ? pickMultiple(['nuts', 'shellfish', 'dairy', 'eggs', 'gluten', 'soy'], 1, 2) : [],
    hobbies: pickMultiple(LIKES, 2, 5),
  });
}

export async function seedTestData(count: number = 500) {
  console.log(`Starting to generate ${count} test people...`);
  const userId = await getCurrentUserId();
  const startTime = Date.now();

  const createdPeople: { id: string; name: string }[] = [];

  // Create people in batches for better performance
  const batchSize = 50;
  for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
    const batchStart = batch * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, count);
    const batchPeople = [];

    console.log(`Creating people ${batchStart + 1} to ${batchEnd}...`);

    for (let i = batchStart; i < batchEnd; i++) {
      const firstName = pickRandom(FIRST_NAMES);
      const lastName = pickRandom(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const id = randomUUID();

      const personData = {
        id,
        userId,
        name,
        nickname: Math.random() > 0.7 ? firstName.substring(0, 3) : null,
        personType: 'human' as const,
        relationshipType: pickRandom(RELATIONSHIP_TYPES),
        importanceToUser: pickRandom(IMPORTANCE_LEVELS),
        dateOfBirth: generateBirthday(),
        phone: generatePhone(),
        email: generateEmail(firstName, lastName),
        occupation: pickRandom(JOBS),
        notes: `Met through ${pickRandom(['work', 'school', 'mutual friends', 'online', 'neighborhood', 'hobby group'])}. ${pickRandom(['Very friendly', 'Interesting person', 'Great to talk to', 'Knowledgeable', 'Fun to be around'])}.`,
        tags: JSON.stringify(pickMultiple(['work', 'school', 'family', 'college', 'gym', 'book-club', 'neighbors', 'church', 'sports-league'], 1, 3)),
        mentionCount: Math.floor(Math.random() * 20),
        dataCompleteness: pickRandom(COMPLETENESS_LEVELS),
        status: 'active' as const,
        addedBy: 'test_seed' as const,
      };

      batchPeople.push(personData);
      createdPeople.push({ id, name });
    }

    // Insert batch
    await db.insert(people).values(batchPeople);
  }

  console.log(`Created ${createdPeople.length} people. Now adding relations...`);

  // Add relations (likes, dislikes, diet preferences)
  const relationsBatch = [];
  for (const person of createdPeople) {
    // Add 3-10 relations per person
    const numRelations = 3 + Math.floor(Math.random() * 8);

    for (let i = 0; i < numRelations; i++) {
      const relationType = pickRandom([
        'LIKES', 'DISLIKES', 'CARES_ABOUT', 'HAS_DIET', 'HAS_ALLERGY',
        'WORKS_AT', 'INTERESTED_IN', 'SKILLED_IN',
      ]);

      let objectLabel = '';
      switch (relationType) {
        case 'LIKES':
          objectLabel = pickRandom(LIKES);
          break;
        case 'DISLIKES':
          objectLabel = pickRandom(DISLIKES);
          break;
        case 'CARES_ABOUT':
          objectLabel = pickRandom(CARES_ABOUT);
          break;
        case 'HAS_DIET':
          objectLabel = pickRandom(DIETS);
          break;
        case 'HAS_ALLERGY':
          objectLabel = pickRandom(['nuts', 'shellfish', 'dairy', 'eggs', 'gluten', 'soy', 'peanuts']);
          break;
        case 'WORKS_AT':
          objectLabel = pickRandom(['Google', 'Apple', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Tesla', 'Startup', 'Hospital', 'University']);
          break;
        case 'INTERESTED_IN':
          objectLabel = pickRandom(LIKES);
          break;
        case 'SKILLED_IN':
          objectLabel = pickRandom(['Python', 'JavaScript', 'Design', 'Writing', 'Public Speaking', 'Leadership', 'Analysis']);
          break;
      }

      relationsBatch.push({
        id: randomUUID(),
        userId,
        subjectId: person.id,
        relationType,
        objectLabel,
        category: relationType.toLowerCase().replace('has_', '').replace('_', ' '),
        source: 'test_seed' as const,
        confidence: 0.8 + Math.random() * 0.2,
        intensity: pickRandom(['strong', 'medium', 'weak']),
      });
    }

    // Insert relations in batches of 500
    if (relationsBatch.length >= 500) {
      await db.insert(relations).values(relationsBatch.splice(0, 500) as any);
      console.log(`Inserted relations batch...`);
    }
  }

  // Insert remaining relations
  if (relationsBatch.length > 0) {
    await db.insert(relations).values(relationsBatch as any);
  }

  console.log(`Created ${createdPeople.length * 6} relations. Now adding connections between people...`);

  // Create connections between people (social network)
  const connectionsBatch = [];
  const connectionPairs = new Set<string>();

  // Each person connects to 2-10 other people
  for (const person of createdPeople) {
    const numConnections = 2 + Math.floor(Math.random() * 8);

    for (let i = 0; i < numConnections; i++) {
      const otherPerson = pickRandom(createdPeople);
      if (otherPerson.id === person.id) continue;

      // Create unique pair key (sorted to avoid duplicates)
      const pairKey = [person.id, otherPerson.id].sort().join('-');
      if (connectionPairs.has(pairKey)) continue;
      connectionPairs.add(pairKey);

      connectionsBatch.push({
        id: randomUUID(),
        userId,
        person1Id: person.id,
        person2Id: otherPerson.id,
        relationshipType: pickRandom(['friend', 'colleague', 'family', 'acquaintance', 'partner']),
        status: 'active' as const,
        strength: pickRandom(['strong', 'moderate', 'weak'] as const),
        source: 'test_seed' as const,
        notes: pickRandom([
          'Known each other for years',
          'Met recently',
          'Work together',
          'College friends',
          'Neighbors',
          'Met through mutual friends',
          null,
        ]),
      });

      // Insert connections in batches
      if (connectionsBatch.length >= 500) {
        await db.insert(connections).values(connectionsBatch.splice(0, 500) as any);
        console.log(`Inserted connections batch...`);
      }
    }
  }

  // Insert remaining connections
  if (connectionsBatch.length > 0) {
    await db.insert(connections).values(connectionsBatch as any);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`
=== Test Data Generation Complete ===
People created: ${createdPeople.length}
Connections created: ${connectionPairs.size}
Time taken: ${duration} seconds
=====================================
  `);

  return {
    peopleCount: createdPeople.length,
    connectionsCount: connectionPairs.size,
    duration: parseFloat(duration),
  };
}

// Quick delete function to clean up test data
export async function clearTestData() {
  console.log('Clearing test data...');
  const userId = await getCurrentUserId();

  // Delete test connections
  await db.delete(connections).where(
    // @ts-ignore
    connections.source === 'test_seed'
  );

  // Delete test relations
  await db.delete(relations).where(
    // @ts-ignore
    relations.source === 'test_seed'
  );

  // Delete test people
  await db.delete(people).where(
    // @ts-ignore
    people.addedBy === 'test_seed'
  );

  console.log('Test data cleared!');
}
