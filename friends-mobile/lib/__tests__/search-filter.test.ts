import { describe, it, expect } from '@jest/globals';

// Mock data for testing
const mockPeople = [
  {
    id: 'person-1',
    name: 'John Doe',
    nickname: 'Johnny',
    relationshipType: 'friend',
    notes: 'Likes hiking',
  },
  {
    id: 'person-2',
    name: 'Jane Smith',
    nickname: 'Janie',
    relationshipType: 'colleague',
    notes: 'Works at Google',
  },
  {
    id: 'person-3',
    name: 'Alice Johnson',
    relationshipType: 'family',
    notes: 'Sister',
  },
  {
    id: 'person-4',
    name: 'Bob Williams',
    nickname: 'Bobby',
    relationshipType: 'acquaintance',
  },
];

const mockRelations = [
  {
    id: 'rel-1',
    subjectId: 'person-1',
    relationType: 'likes',
    objectLabel: 'Pizza',
    category: 'food',
    confidence: 0.9,
  },
  {
    id: 'rel-2',
    subjectId: 'person-1',
    relationType: 'dislikes',
    objectLabel: 'Carrots',
    category: 'food',
    confidence: 0.8,
  },
  {
    id: 'rel-3',
    subjectId: 'person-2',
    relationType: 'likes',
    objectLabel: 'Hiking',
    category: 'hobbies',
    confidence: 1.0,
  },
  {
    id: 'rel-4',
    subjectId: 'person-2',
    relationType: 'friend',
    objectLabel: 'John Doe',
    confidence: 0.95,
  },
];

const mockStories = [
  {
    id: 'story-1',
    content: 'Had a great dinner with John at the new pizza place downtown.',
    title: 'Dinner Night',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'story-2',
    content: 'Jane and I went hiking in the mountains. Beautiful views!',
    title: 'Weekend Hike',
    createdAt: new Date('2024-01-20'),
  },
  {
    id: 'story-3',
    content: 'Family gathering at Alices house. Everyone brought food.',
    title: null,
    createdAt: new Date('2024-01-10'),
  },
];

describe('Search & Filter - People Search', () => {
  describe('Search by Name', () => {
    it('should find person by exact name match', () => {
      const query = 'john doe';
      const results = searchPeople(mockPeople, query);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('John Doe');
    });

    it('should find person by partial name match', () => {
      const query = 'jo';
      const results = searchPeople(mockPeople, query);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((p) => p.name.toLowerCase().includes('jo'))).toBe(true);
    });

    it('should be case-insensitive', () => {
      const resultsLower = searchPeople(mockPeople, 'john');
      const resultsUpper = searchPeople(mockPeople, 'JOHN');
      const resultsMixed = searchPeople(mockPeople, 'JoHn');

      expect(resultsLower).toEqual(resultsUpper);
      expect(resultsLower).toEqual(resultsMixed);
    });

    it('should handle special characters', () => {
      const peopleWithSpecial = [
        ...mockPeople,
        { id: 'person-5', name: "O'Brien", relationshipType: 'friend' },
      ];

      const results = searchPeople(peopleWithSpecial, "o'brien");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("O'Brien");
    });

    it('should return empty array for no matches', () => {
      const query = 'xyz-nonexistent';
      const results = searchPeople(mockPeople, query);

      expect(results).toHaveLength(0);
    });
  });

  describe('Search by Nickname', () => {
    it('should find person by nickname', () => {
      const query = 'johnny';
      const results = searchPeople(mockPeople, query);

      expect(results).toHaveLength(1);
      expect(results[0].nickname).toBe('Johnny');
    });

    it('should match both name and nickname', () => {
      const query = 'jane';
      const results = searchPeople(mockPeople, query);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Jane');
    });
  });

  describe('Search by Notes', () => {
    it('should find person by notes content', () => {
      const query = 'google';
      const results = searchPeople(mockPeople, query);

      expect(results).toHaveLength(1);
      expect(results[0].notes).toContain('Google');
    });
  });

  describe('Search by Relationship Type', () => {
    it('should filter by relationship type', () => {
      const results = filterPeopleByRelationship(mockPeople, 'friend');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((p) => p.relationshipType === 'friend')).toBe(true);
    });

    it('should handle multiple relationship types', () => {
      const results = filterPeopleByRelationship(mockPeople, ['friend', 'family']);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((p) => ['friend', 'family'].includes(p.relationshipType))).toBe(true);
    });
  });
});

describe('Search & Filter - Story Search', () => {
  describe('Search by Content', () => {
    it('should find story by content match', () => {
      const query = 'pizza';
      const results = searchStories(mockStories, query);

      expect(results).toHaveLength(1);
      expect(results[0].content.toLowerCase()).toContain('pizza');
    });

    it('should find story by title', () => {
      const query = 'dinner';
      const results = searchStories(mockStories, query);

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Dinner');
    });

    it('should search both title and content', () => {
      const query = 'hiking';
      const results = searchStories(mockStories, query);

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Filter by Date Range', () => {
    it('should filter stories by date range', () => {
      const startDate = new Date('2024-01-12');
      const endDate = new Date('2024-01-25');

      const results = filterStoriesByDateRange(mockStories, startDate, endDate);

      expect(results.length).toBeGreaterThan(0);
      results.forEach((story) => {
        expect(new Date(story.createdAt).getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(new Date(story.createdAt).getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should handle single date filter (stories after date)', () => {
      const afterDate = new Date('2024-01-15');
      const results = filterStoriesAfterDate(mockStories, afterDate);

      results.forEach((story) => {
        expect(new Date(story.createdAt).getTime()).toBeGreaterThanOrEqual(afterDate.getTime());
      });
    });
  });
});

describe('Search & Filter - Relation Filtering', () => {
  describe('Filter by Relation Type', () => {
    it('should filter by single relation type', () => {
      const results = filterRelationsByType(mockRelations, 'likes');

      expect(results.every((r) => r.relationType === 'likes')).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by multiple relation types', () => {
      const results = filterRelationsByType(mockRelations, ['likes', 'dislikes']);

      expect(results.every((r) => ['likes', 'dislikes'].includes(r.relationType))).toBe(true);
    });
  });

  describe('Filter by Category', () => {
    it('should filter relations by category', () => {
      const results = filterRelationsByCategory(mockRelations, 'food');

      expect(results.every((r) => r.category === 'food')).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Filter by Confidence Threshold', () => {
    it('should return relations above confidence threshold', () => {
      const threshold = 0.85;
      const results = filterRelationsByConfidence(mockRelations, threshold);

      results.forEach((rel) => {
        expect(rel.confidence).toBeGreaterThanOrEqual(threshold);
      });
    });

    it('should handle 100% confidence filter', () => {
      const results = filterRelationsByConfidence(mockRelations, 1.0);

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBe(1.0);
    });
  });
});

describe('Search & Filter - Performance', () => {
  it('should handle search with 100+ people efficiently', () => {
    const largePeopleSet = generateMockPeople(100);
    const startTime = Date.now();

    searchPeople(largePeopleSet, 'john');

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should complete in less than 100ms
  });

  it('should handle filtering 500+ relations efficiently', () => {
    const largeRelationsSet = generateMockRelations(500);
    const startTime = Date.now();

    filterRelationsByType(largeRelationsSet, 'likes');

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(50); // Should complete in less than 50ms
  });

  it('should handle complex multi-filter search', () => {
    const largePeopleSet = generateMockPeople(200);
    const startTime = Date.now();

    // Search + filter
    const results = searchPeople(largePeopleSet, 'john');
    filterPeopleByRelationship(results, 'friend');

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(150); // Should complete in less than 150ms
  });
});

// Helper functions for search and filter
function searchPeople(people: any[], query: string) {
  const lowerQuery = query.toLowerCase().trim();
  return people.filter((person) => {
    const nameMatch = person.name.toLowerCase().includes(lowerQuery);
    const nicknameMatch = person.nickname?.toLowerCase().includes(lowerQuery);
    const notesMatch = person.notes?.toLowerCase().includes(lowerQuery);

    return nameMatch || nicknameMatch || notesMatch;
  });
}

function filterPeopleByRelationship(people: any[], types: string | string[]) {
  const typeArray = Array.isArray(types) ? types : [types];
  return people.filter((person) => typeArray.includes(person.relationshipType));
}

function searchStories(stories: any[], query: string) {
  const lowerQuery = query.toLowerCase().trim();
  return stories.filter((story) => {
    const contentMatch = story.content.toLowerCase().includes(lowerQuery);
    const titleMatch = story.title?.toLowerCase().includes(lowerQuery);

    return contentMatch || titleMatch;
  });
}

function filterStoriesByDateRange(stories: any[], startDate: Date, endDate: Date) {
  return stories.filter((story) => {
    const storyDate = new Date(story.createdAt).getTime();
    return storyDate >= startDate.getTime() && storyDate <= endDate.getTime();
  });
}

function filterStoriesAfterDate(stories: any[], afterDate: Date) {
  return stories.filter((story) => new Date(story.createdAt).getTime() >= afterDate.getTime());
}

function filterRelationsByType(relations: any[], types: string | string[]) {
  const typeArray = Array.isArray(types) ? types : [types];
  return relations.filter((rel) => typeArray.includes(rel.relationType));
}

function filterRelationsByCategory(relations: any[], category: string) {
  return relations.filter((rel) => rel.category === category);
}

function filterRelationsByConfidence(relations: any[], threshold: number) {
  return relations.filter((rel) => rel.confidence >= threshold);
}

function generateMockPeople(count: number) {
  const people = [];
  for (let i = 0; i < count; i++) {
    people.push({
      id: `person-${i}`,
      name: `Person ${i}`,
      nickname: i % 3 === 0 ? `Nick${i}` : undefined,
      relationshipType: ['friend', 'family', 'colleague'][i % 3],
      notes: i % 5 === 0 ? 'Has special notes' : undefined,
    });
  }
  return people;
}

function generateMockRelations(count: number) {
  const relations = [];
  for (let i = 0; i < count; i++) {
    relations.push({
      id: `rel-${i}`,
      subjectId: `person-${i % 10}`,
      relationType: ['likes', 'dislikes', 'friend'][i % 3],
      objectLabel: `Object ${i}`,
      category: i % 2 === 0 ? 'food' : 'hobbies',
      confidence: Math.random(),
    });
  }
  return relations;
}
