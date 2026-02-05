/**
 * Database Operations Tests
 *
 * Tests for core database operations including:
 * - User management
 * - People/contacts management
 * - Relations (likes, dislikes, fears, etc.)
 * - Connections between people
 * - Stories
 */

import { randomUUID } from 'expo-crypto';

// Mock types that mirror the actual schema
interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  role: 'user' | 'premium' | 'pro';
  subscriptionTier: 'free' | 'premium' | 'pro';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface Person {
  id: string;
  userId: string;
  name: string;
  nickname: string | null;
  relationshipType: 'friend' | 'family' | 'colleague' | 'acquaintance' | 'partner' | null;
  personType: 'primary' | 'mentioned' | 'placeholder';
  status: 'active' | 'archived' | 'deceased' | 'placeholder' | 'merged';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface Relation {
  id: string;
  userId: string;
  subjectId: string;
  relationType: string;
  objectLabel: string;
  objectType: string | null;
  intensity: 'weak' | 'medium' | 'strong' | 'very_strong' | null;
  confidence: number;
  category: string | null;
  source: 'manual' | 'ai_extraction' | 'question_mode' | 'voice_note' | 'import';
  status: 'current' | 'past' | 'future' | 'aspiration';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface Connection {
  id: string;
  userId: string;
  person1Id: string;
  person2Id: string;
  relationshipType: 'friend' | 'family' | 'colleague' | 'partner' | 'acquaintance';
  status: 'active' | 'inactive' | 'ended' | 'complicated';
  strength: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface Story {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  aiProcessed: boolean;
  storyDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// In-memory database for testing
class MockDatabase {
  users: Map<string, User> = new Map();
  people: Map<string, Person> = new Map();
  relations: Map<string, Relation> = new Map();
  connections: Map<string, Connection> = new Map();
  stories: Map<string, Story> = new Map();

  reset() {
    this.users.clear();
    this.people.clear();
    this.relations.clear();
    this.connections.clear();
    this.stories.clear();
  }
}

const mockDb = new MockDatabase();

// Mock database service functions
const userService = {
  createUser: (data: Partial<User>): User => {
    const user: User = {
      id: data.id || randomUUID(),
      email: data.email || null,
      displayName: data.displayName || null,
      role: data.role || 'user',
      subscriptionTier: data.subscriptionTier || 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    mockDb.users.set(user.id, user);
    return user;
  },

  getUserById: (id: string): User | null => {
    return mockDb.users.get(id) || null;
  },

  updateUser: (id: string, data: Partial<User>): User | null => {
    const user = mockDb.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...data, updatedAt: new Date() };
    mockDb.users.set(id, updated);
    return updated;
  },

  deleteUser: (id: string): boolean => {
    const user = mockDb.users.get(id);
    if (!user) return false;
    user.deletedAt = new Date();
    mockDb.users.set(id, user);
    return true;
  },

  listUsers: (): User[] => {
    return Array.from(mockDb.users.values()).filter((u) => !u.deletedAt);
  },
};

const peopleService = {
  createPerson: (userId: string, data: Partial<Person>): Person => {
    const person: Person = {
      id: data.id || randomUUID(),
      userId,
      name: data.name || 'Unknown',
      nickname: data.nickname || null,
      relationshipType: data.relationshipType || null,
      personType: data.personType || 'placeholder',
      status: data.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    mockDb.people.set(person.id, person);
    return person;
  },

  getPersonById: (id: string, userId: string): Person | null => {
    const person = mockDb.people.get(id);
    if (!person || person.userId !== userId || person.deletedAt) return null;
    return person;
  },

  updatePerson: (id: string, userId: string, data: Partial<Person>): Person | null => {
    const person = mockDb.people.get(id);
    if (!person || person.userId !== userId) return null;
    const updated = { ...person, ...data, updatedAt: new Date() };
    mockDb.people.set(id, updated);
    return updated;
  },

  deletePerson: (id: string, userId: string): boolean => {
    const person = mockDb.people.get(id);
    if (!person || person.userId !== userId) return false;
    person.deletedAt = new Date();
    mockDb.people.set(id, person);
    return true;
  },

  listPeople: (userId: string): Person[] => {
    return Array.from(mockDb.people.values()).filter(
      (p) => p.userId === userId && !p.deletedAt && p.status === 'active'
    );
  },

  searchPeople: (userId: string, query: string): Person[] => {
    const lowerQuery = query.toLowerCase();
    return Array.from(mockDb.people.values()).filter(
      (p) =>
        p.userId === userId &&
        !p.deletedAt &&
        (p.name.toLowerCase().includes(lowerQuery) ||
          (p.nickname && p.nickname.toLowerCase().includes(lowerQuery)))
    );
  },
};

const relationsService = {
  createRelation: (userId: string, data: Partial<Relation>): Relation => {
    const relation: Relation = {
      id: data.id || randomUUID(),
      userId,
      subjectId: data.subjectId || '',
      relationType: data.relationType || 'KNOWS',
      objectLabel: data.objectLabel || '',
      objectType: data.objectType || null,
      intensity: data.intensity || null,
      confidence: data.confidence ?? 1.0,
      category: data.category || null,
      source: data.source || 'manual',
      status: data.status || 'current',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    mockDb.relations.set(relation.id, relation);
    return relation;
  },

  getRelationById: (id: string, userId: string): Relation | null => {
    const relation = mockDb.relations.get(id);
    if (!relation || relation.userId !== userId || relation.deletedAt) return null;
    return relation;
  },

  getRelationsForPerson: (personId: string, userId: string): Relation[] => {
    return Array.from(mockDb.relations.values()).filter(
      (r) => r.subjectId === personId && r.userId === userId && !r.deletedAt
    );
  },

  getRelationsByType: (userId: string, relationType: string): Relation[] => {
    return Array.from(mockDb.relations.values()).filter(
      (r) => r.userId === userId && r.relationType === relationType && !r.deletedAt
    );
  },

  updateRelation: (id: string, userId: string, data: Partial<Relation>): Relation | null => {
    const relation = mockDb.relations.get(id);
    if (!relation || relation.userId !== userId) return null;
    const updated = { ...relation, ...data, updatedAt: new Date() };
    mockDb.relations.set(id, updated);
    return updated;
  },

  deleteRelation: (id: string, userId: string): boolean => {
    const relation = mockDb.relations.get(id);
    if (!relation || relation.userId !== userId) return false;
    relation.deletedAt = new Date();
    mockDb.relations.set(id, relation);
    return true;
  },
};

const connectionsService = {
  createConnection: (userId: string, data: Partial<Connection>): Connection => {
    const connection: Connection = {
      id: data.id || randomUUID(),
      userId,
      person1Id: data.person1Id || '',
      person2Id: data.person2Id || '',
      relationshipType: data.relationshipType || 'acquaintance',
      status: data.status || 'active',
      strength: data.strength ?? 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    mockDb.connections.set(connection.id, connection);
    return connection;
  },

  getConnectionById: (id: string, userId: string): Connection | null => {
    const connection = mockDb.connections.get(id);
    if (!connection || connection.userId !== userId || connection.deletedAt) return null;
    return connection;
  },

  getConnectionsForPerson: (personId: string, userId: string): Connection[] => {
    return Array.from(mockDb.connections.values()).filter(
      (c) =>
        (c.person1Id === personId || c.person2Id === personId) &&
        c.userId === userId &&
        !c.deletedAt
    );
  },

  updateConnection: (id: string, userId: string, data: Partial<Connection>): Connection | null => {
    const connection = mockDb.connections.get(id);
    if (!connection || connection.userId !== userId) return null;
    const updated = { ...connection, ...data, updatedAt: new Date() };
    mockDb.connections.set(id, updated);
    return updated;
  },

  deleteConnection: (id: string, userId: string): boolean => {
    const connection = mockDb.connections.get(id);
    if (!connection || connection.userId !== userId) return false;
    connection.deletedAt = new Date();
    mockDb.connections.set(id, connection);
    return true;
  },
};

const storiesService = {
  createStory: (userId: string, data: Partial<Story>): Story => {
    const story: Story = {
      id: data.id || randomUUID(),
      userId,
      title: data.title || null,
      content: data.content || '',
      aiProcessed: data.aiProcessed ?? false,
      storyDate: data.storyDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    mockDb.stories.set(story.id, story);
    return story;
  },

  getStoryById: (id: string, userId: string): Story | null => {
    const story = mockDb.stories.get(id);
    if (!story || story.userId !== userId || story.deletedAt) return null;
    return story;
  },

  listStories: (userId: string): Story[] => {
    return Array.from(mockDb.stories.values()).filter((s) => s.userId === userId && !s.deletedAt);
  },

  updateStory: (id: string, userId: string, data: Partial<Story>): Story | null => {
    const story = mockDb.stories.get(id);
    if (!story || story.userId !== userId) return null;
    const updated = { ...story, ...data, updatedAt: new Date() };
    mockDb.stories.set(id, updated);
    return updated;
  },

  deleteStory: (id: string, userId: string): boolean => {
    const story = mockDb.stories.get(id);
    if (!story || story.userId !== userId) return false;
    story.deletedAt = new Date();
    mockDb.stories.set(id, story);
    return true;
  },

  markAsProcessed: (id: string, userId: string): Story | null => {
    return storiesService.updateStory(id, userId, { aiProcessed: true });
  },
};

// ============================================================================
// TESTS
// ============================================================================

describe('User Management', () => {
  beforeEach(() => {
    mockDb.reset();
  });

  describe('createUser', () => {
    it('should create a new user with default values', () => {
      const user = userService.createUser({});

      expect(user.id).toBeDefined();
      expect(user.role).toBe('user');
      expect(user.subscriptionTier).toBe('free');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should create a user with custom values', () => {
      const user = userService.createUser({
        email: 'test@example.com',
        displayName: 'Test User',
        subscriptionTier: 'premium',
      });

      expect(user.email).toBe('test@example.com');
      expect(user.displayName).toBe('Test User');
      expect(user.subscriptionTier).toBe('premium');
    });
  });

  describe('getUserById', () => {
    it('should retrieve an existing user', () => {
      const created = userService.createUser({ displayName: 'John' });
      const retrieved = userService.getUserById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.displayName).toBe('John');
    });

    it('should return null for non-existent user', () => {
      const retrieved = userService.getUserById('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user properties', () => {
      const user = userService.createUser({ displayName: 'Original' });
      const updated = userService.updateUser(user.id, { displayName: 'Updated' });

      expect(updated?.displayName).toBe('Updated');
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(user.createdAt.getTime());
    });

    it('should return null when updating non-existent user', () => {
      const result = userService.updateUser('non-existent', { displayName: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should soft delete a user', () => {
      const user = userService.createUser({});
      const deleted = userService.deleteUser(user.id);

      expect(deleted).toBe(true);

      const retrieved = mockDb.users.get(user.id);
      expect(retrieved?.deletedAt).not.toBeNull();
    });

    it('should not list deleted users', () => {
      const user = userService.createUser({});
      userService.deleteUser(user.id);

      const users = userService.listUsers();
      expect(users.find((u) => u.id === user.id)).toBeUndefined();
    });
  });
});

describe('People/Contacts Management', () => {
  let testUserId: string;

  beforeEach(() => {
    mockDb.reset();
    const user = userService.createUser({});
    testUserId = user.id;
  });

  describe('createPerson', () => {
    it('should create a person with required fields', () => {
      const person = peopleService.createPerson(testUserId, { name: 'Alice' });

      expect(person.id).toBeDefined();
      expect(person.name).toBe('Alice');
      expect(person.userId).toBe(testUserId);
      expect(person.status).toBe('active');
    });

    it('should create a person with all optional fields', () => {
      const person = peopleService.createPerson(testUserId, {
        name: 'Bob',
        nickname: 'Bobby',
        relationshipType: 'friend',
        personType: 'primary',
      });

      expect(person.nickname).toBe('Bobby');
      expect(person.relationshipType).toBe('friend');
      expect(person.personType).toBe('primary');
    });
  });

  describe('getPersonById', () => {
    it('should retrieve person for correct user', () => {
      const person = peopleService.createPerson(testUserId, { name: 'Charlie' });
      const retrieved = peopleService.getPersonById(person.id, testUserId);

      expect(retrieved?.name).toBe('Charlie');
    });

    it('should not retrieve person for different user', () => {
      const person = peopleService.createPerson(testUserId, { name: 'Charlie' });
      const retrieved = peopleService.getPersonById(person.id, 'different-user');

      expect(retrieved).toBeNull();
    });
  });

  describe('listPeople', () => {
    it('should list only active people for user', () => {
      peopleService.createPerson(testUserId, { name: 'Person 1' });
      peopleService.createPerson(testUserId, { name: 'Person 2' });
      peopleService.createPerson(testUserId, { name: 'Archived', status: 'archived' });

      const people = peopleService.listPeople(testUserId);

      expect(people.length).toBe(2);
      expect(people.map((p) => p.name)).toContain('Person 1');
      expect(people.map((p) => p.name)).toContain('Person 2');
    });
  });

  describe('searchPeople', () => {
    it('should search by name', () => {
      peopleService.createPerson(testUserId, { name: 'Alice Johnson' });
      peopleService.createPerson(testUserId, { name: 'Bob Smith' });
      peopleService.createPerson(testUserId, { name: 'Alicia Keys' });

      const results = peopleService.searchPeople(testUserId, 'Ali');

      expect(results.length).toBe(2);
    });

    it('should search by nickname', () => {
      peopleService.createPerson(testUserId, { name: 'Robert', nickname: 'Bobby' });
      peopleService.createPerson(testUserId, { name: 'Bob' });

      const results = peopleService.searchPeople(testUserId, 'Bob');

      expect(results.length).toBe(2);
    });
  });

  describe('updatePerson', () => {
    it('should update person properties', () => {
      const person = peopleService.createPerson(testUserId, { name: 'Original' });
      const updated = peopleService.updatePerson(person.id, testUserId, {
        name: 'Updated Name',
        relationshipType: 'family',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.relationshipType).toBe('family');
    });
  });

  describe('deletePerson', () => {
    it('should soft delete a person', () => {
      const person = peopleService.createPerson(testUserId, { name: 'ToDelete' });
      const result = peopleService.deletePerson(person.id, testUserId);

      expect(result).toBe(true);

      const retrieved = peopleService.getPersonById(person.id, testUserId);
      expect(retrieved).toBeNull();
    });
  });
});

describe('Relations Management', () => {
  let testUserId: string;
  let testPersonId: string;

  beforeEach(() => {
    mockDb.reset();
    const user = userService.createUser({});
    testUserId = user.id;
    const person = peopleService.createPerson(testUserId, { name: 'Test Person' });
    testPersonId = person.id;
  });

  describe('createRelation - LIKES', () => {
    it('should create a LIKES relation', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'LIKES',
        objectLabel: 'pizza',
        objectType: 'food',
        intensity: 'strong',
        category: 'food',
      });

      expect(relation.relationType).toBe('LIKES');
      expect(relation.objectLabel).toBe('pizza');
      expect(relation.intensity).toBe('strong');
    });

    it('should create multiple LIKES for same person', () => {
      relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'LIKES',
        objectLabel: 'pizza',
      });
      relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'LIKES',
        objectLabel: 'sushi',
      });

      const relations = relationsService.getRelationsForPerson(testPersonId, testUserId);
      expect(relations.length).toBe(2);
    });
  });

  describe('createRelation - DISLIKES', () => {
    it('should create a DISLIKES relation', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'DISLIKES',
        objectLabel: 'mushrooms',
        objectType: 'food',
        intensity: 'very_strong',
      });

      expect(relation.relationType).toBe('DISLIKES');
      expect(relation.objectLabel).toBe('mushrooms');
    });
  });

  describe('createRelation - FEARS', () => {
    it('should create a FEARS relation', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'FEARS',
        objectLabel: 'spiders',
        intensity: 'strong',
      });

      expect(relation.relationType).toBe('FEARS');
      expect(relation.objectLabel).toBe('spiders');
    });
  });

  describe('createRelation - IS (identity)', () => {
    it('should create an IS relation for profession', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'IS',
        objectLabel: 'software engineer',
        category: 'profession',
      });

      expect(relation.relationType).toBe('IS');
      expect(relation.objectLabel).toBe('software engineer');
      expect(relation.category).toBe('profession');
    });

    it('should create an IS relation for dietary restriction', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'IS',
        objectLabel: 'vegan',
        category: 'diet',
      });

      expect(relation.relationType).toBe('IS');
      expect(relation.objectLabel).toBe('vegan');
    });
  });

  describe('createRelation - SENSITIVE_TO (allergies)', () => {
    it('should create a SENSITIVE_TO relation for allergy', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'SENSITIVE_TO',
        objectLabel: 'peanuts',
        intensity: 'very_strong',
        category: 'allergy',
      });

      expect(relation.relationType).toBe('SENSITIVE_TO');
      expect(relation.objectLabel).toBe('peanuts');
      expect(relation.intensity).toBe('very_strong');
    });
  });

  describe('getRelationsByType', () => {
    it('should get all relations of a specific type', () => {
      const person2 = peopleService.createPerson(testUserId, { name: 'Person 2' });

      relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'LIKES',
        objectLabel: 'coffee',
      });
      relationsService.createRelation(testUserId, {
        subjectId: person2.id,
        relationType: 'LIKES',
        objectLabel: 'tea',
      });
      relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'DISLIKES',
        objectLabel: 'broccoli',
      });

      const likesRelations = relationsService.getRelationsByType(testUserId, 'LIKES');
      expect(likesRelations.length).toBe(2);
    });
  });

  describe('updateRelation', () => {
    it('should update relation intensity', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'LIKES',
        objectLabel: 'coffee',
        intensity: 'medium',
      });

      const updated = relationsService.updateRelation(relation.id, testUserId, {
        intensity: 'very_strong',
      });

      expect(updated?.intensity).toBe('very_strong');
    });

    it('should update relation status to past', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'LIKES',
        objectLabel: 'smoking',
        status: 'current',
      });

      const updated = relationsService.updateRelation(relation.id, testUserId, {
        status: 'past',
      });

      expect(updated?.status).toBe('past');
    });
  });

  describe('deleteRelation', () => {
    it('should soft delete a relation', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'LIKES',
        objectLabel: 'old hobby',
      });

      const result = relationsService.deleteRelation(relation.id, testUserId);
      expect(result).toBe(true);

      const retrieved = relationsService.getRelationById(relation.id, testUserId);
      expect(retrieved).toBeNull();
    });
  });

  describe('AI extraction source tracking', () => {
    it('should track manual source', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'LIKES',
        objectLabel: 'manual entry',
        source: 'manual',
      });

      expect(relation.source).toBe('manual');
    });

    it('should track AI extraction source with confidence', () => {
      const relation = relationsService.createRelation(testUserId, {
        subjectId: testPersonId,
        relationType: 'LIKES',
        objectLabel: 'ai detected',
        source: 'ai_extraction',
        confidence: 0.85,
      });

      expect(relation.source).toBe('ai_extraction');
      expect(relation.confidence).toBe(0.85);
    });
  });
});

describe('Connections Between People', () => {
  let testUserId: string;
  let person1Id: string;
  let person2Id: string;

  beforeEach(() => {
    mockDb.reset();
    const user = userService.createUser({});
    testUserId = user.id;
    const person1 = peopleService.createPerson(testUserId, { name: 'Alice' });
    const person2 = peopleService.createPerson(testUserId, { name: 'Bob' });
    person1Id = person1.id;
    person2Id = person2.id;
  });

  describe('createConnection', () => {
    it('should create a friend connection', () => {
      const connection = connectionsService.createConnection(testUserId, {
        person1Id,
        person2Id,
        relationshipType: 'friend',
        strength: 0.8,
      });

      expect(connection.relationshipType).toBe('friend');
      expect(connection.strength).toBe(0.8);
      expect(connection.status).toBe('active');
    });

    it('should create a family connection', () => {
      const connection = connectionsService.createConnection(testUserId, {
        person1Id,
        person2Id,
        relationshipType: 'family',
      });

      expect(connection.relationshipType).toBe('family');
    });

    it('should create a colleague connection', () => {
      const connection = connectionsService.createConnection(testUserId, {
        person1Id,
        person2Id,
        relationshipType: 'colleague',
        strength: 0.5,
      });

      expect(connection.relationshipType).toBe('colleague');
    });
  });

  describe('getConnectionsForPerson', () => {
    it('should get all connections for a person', () => {
      const person3 = peopleService.createPerson(testUserId, { name: 'Charlie' });

      connectionsService.createConnection(testUserId, {
        person1Id,
        person2Id,
        relationshipType: 'friend',
      });
      connectionsService.createConnection(testUserId, {
        person1Id,
        person2Id: person3.id,
        relationshipType: 'colleague',
      });

      const connections = connectionsService.getConnectionsForPerson(person1Id, testUserId);
      expect(connections.length).toBe(2);
    });
  });

  describe('updateConnection', () => {
    it('should update connection strength', () => {
      const connection = connectionsService.createConnection(testUserId, {
        person1Id,
        person2Id,
        relationshipType: 'friend',
        strength: 0.5,
      });

      const updated = connectionsService.updateConnection(connection.id, testUserId, {
        strength: 0.9,
      });

      expect(updated?.strength).toBe(0.9);
    });

    it('should update connection status to ended', () => {
      const connection = connectionsService.createConnection(testUserId, {
        person1Id,
        person2Id,
        relationshipType: 'partner',
      });

      const updated = connectionsService.updateConnection(connection.id, testUserId, {
        status: 'ended',
      });

      expect(updated?.status).toBe('ended');
    });
  });
});

describe('Stories Management', () => {
  let testUserId: string;

  beforeEach(() => {
    mockDb.reset();
    const user = userService.createUser({});
    testUserId = user.id;
  });

  describe('createStory', () => {
    it('should create a story with content', () => {
      const story = storiesService.createStory(testUserId, {
        title: 'Birthday Party',
        content: 'Had a great time at Johns birthday. He loved the cake!',
        storyDate: new Date('2024-01-15'),
      });

      expect(story.title).toBe('Birthday Party');
      expect(story.content).toContain('Johns birthday');
      expect(story.aiProcessed).toBe(false);
    });

    it('should create a story without title', () => {
      const story = storiesService.createStory(testUserId, {
        content: 'Quick note about lunch with Sarah',
      });

      expect(story.title).toBeNull();
      expect(story.content).toBeDefined();
    });
  });

  describe('listStories', () => {
    it('should list all stories for user', () => {
      storiesService.createStory(testUserId, { content: 'Story 1' });
      storiesService.createStory(testUserId, { content: 'Story 2' });
      storiesService.createStory(testUserId, { content: 'Story 3' });

      const stories = storiesService.listStories(testUserId);
      expect(stories.length).toBe(3);
    });
  });

  describe('markAsProcessed', () => {
    it('should mark story as AI processed', () => {
      const story = storiesService.createStory(testUserId, {
        content: 'Content to be processed',
      });

      expect(story.aiProcessed).toBe(false);

      const processed = storiesService.markAsProcessed(story.id, testUserId);
      expect(processed?.aiProcessed).toBe(true);
    });
  });

  describe('updateStory', () => {
    it('should update story content', () => {
      const story = storiesService.createStory(testUserId, {
        content: 'Original content',
      });

      const updated = storiesService.updateStory(story.id, testUserId, {
        content: 'Updated content with more details',
      });

      expect(updated?.content).toBe('Updated content with more details');
    });
  });

  describe('deleteStory', () => {
    it('should soft delete a story', () => {
      const story = storiesService.createStory(testUserId, {
        content: 'Story to delete',
      });

      const result = storiesService.deleteStory(story.id, testUserId);
      expect(result).toBe(true);

      const retrieved = storiesService.getStoryById(story.id, testUserId);
      expect(retrieved).toBeNull();
    });
  });
});

describe('Complete User Workflow', () => {
  beforeEach(() => {
    mockDb.reset();
  });

  it('should handle complete user workflow: create user, add people, add relations', () => {
    // Step 1: Create user
    const user = userService.createUser({
      email: 'john@example.com',
      displayName: 'John Doe',
    });
    expect(user.id).toBeDefined();

    // Step 2: Add some contacts/people
    const alice = peopleService.createPerson(user.id, {
      name: 'Alice Smith',
      relationshipType: 'friend',
      personType: 'primary',
    });

    const bob = peopleService.createPerson(user.id, {
      name: 'Bob Johnson',
      relationshipType: 'colleague',
      personType: 'primary',
    });

    const mom = peopleService.createPerson(user.id, {
      name: 'Mary Doe',
      relationshipType: 'family',
      personType: 'primary',
    });

    // Step 3: Add relations for Alice
    relationsService.createRelation(user.id, {
      subjectId: alice.id,
      relationType: 'LIKES',
      objectLabel: 'sushi',
      category: 'food',
    });

    relationsService.createRelation(user.id, {
      subjectId: alice.id,
      relationType: 'DISLIKES',
      objectLabel: 'mushrooms',
      category: 'food',
    });

    relationsService.createRelation(user.id, {
      subjectId: alice.id,
      relationType: 'IS',
      objectLabel: 'vegetarian',
      category: 'diet',
    });

    // Step 4: Add relations for Bob
    relationsService.createRelation(user.id, {
      subjectId: bob.id,
      relationType: 'SENSITIVE_TO',
      objectLabel: 'gluten',
      intensity: 'strong',
      category: 'allergy',
    });

    // Step 5: Add relations for Mom
    relationsService.createRelation(user.id, {
      subjectId: mom.id,
      relationType: 'LIKES',
      objectLabel: 'gardening',
      category: 'hobby',
    });

    // Step 6: Create connections
    connectionsService.createConnection(user.id, {
      person1Id: alice.id,
      person2Id: bob.id,
      relationshipType: 'colleague',
      strength: 0.6,
    });

    // Step 7: Add a story
    const story = storiesService.createStory(user.id, {
      title: 'Team Lunch',
      content: 'Had lunch with Alice and Bob. Alice had the veggie burger, Bob had the gluten-free pasta.',
    });

    // Verify everything was created
    const people = peopleService.listPeople(user.id);
    expect(people.length).toBe(3);

    const aliceRelations = relationsService.getRelationsForPerson(alice.id, user.id);
    expect(aliceRelations.length).toBe(3);

    const bobRelations = relationsService.getRelationsForPerson(bob.id, user.id);
    expect(bobRelations.length).toBe(1);

    const aliceConnections = connectionsService.getConnectionsForPerson(alice.id, user.id);
    expect(aliceConnections.length).toBe(1);

    const stories = storiesService.listStories(user.id);
    expect(stories.length).toBe(1);
  });
});
