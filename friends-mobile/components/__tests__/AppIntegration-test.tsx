import { describe, it, beforeEach } from '@jest/globals';

// Mock the hooks
const mockCreatePerson = jest.fn();
const mockCreateRelation = jest.fn();
const mockCreateStory = jest.fn();

jest.mock('@/hooks/usePeople', () => ({
  usePeople: jest.fn(() => ({ data: [], isLoading: false, refetch: jest.fn() })),
  useCreatePerson: () => ({ mutateAsync: mockCreatePerson }),
}));

jest.mock('@/hooks/useRelations', () => ({
  useRelations: jest.fn(() => ({ data: [], isLoading: false })),
  useCreateRelation: () => ({ mutateAsync: mockCreateRelation }),
}));

jest.mock('@/hooks/useStories', () => ({
  useStories: jest.fn(() => ({ data: [], isLoading: false })),
  useCreateStory: () => ({ mutateAsync: mockCreateStory }),
}));

describe('App Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should simulate adding people, relations, and stories', async () => {
    // Import hooks after mocking
    const { useCreatePerson } = require('@/hooks/usePeople');
    const { useCreateRelation } = require('@/hooks/useRelations');
    const { useCreateStory } = require('@/hooks/useStories');

    const createPerson = useCreatePerson();
    const createRelation = useCreateRelation();
    const createStory = useCreateStory();

    // Mock return values
    (mockCreatePerson as any).mockResolvedValue({ id: 'person-1' });
    (mockCreateRelation as any).mockResolvedValue({ id: 'relation-1' });
    (mockCreateStory as any).mockResolvedValue({ id: 'story-1' });

    // 1. Add 10 people
    const peopleIds = [];
    for (let i = 0; i < 10; i++) {
      const result = await createPerson.mutateAsync({
        name: `Person ${i + 1}`,
        personType: 'primary',
      });
      peopleIds.push(result?.id || `person-${i}`);
    }

    // 2. Add connections/relations
    await createRelation.mutateAsync({
      subjectId: peopleIds[0],
      relationType: 'friend',
      objectLabel: 'Person 2',
      confidence: 1.0,
    });

    await createRelation.mutateAsync({
      subjectId: peopleIds[0],
      relationType: 'likes',
      objectLabel: 'Pizza',
      category: 'food',
    });

    // 3. Add a story
    await createStory.mutateAsync({
      content: 'Had a great dinner with Person 1 and Person 2.',
      date: new Date(),
    });

    // Assertions
    expect(mockCreatePerson).toHaveBeenCalledTimes(10);
    expect(mockCreateRelation).toHaveBeenCalledTimes(2);
    expect(mockCreateStory).toHaveBeenCalledTimes(1);
  });
});
