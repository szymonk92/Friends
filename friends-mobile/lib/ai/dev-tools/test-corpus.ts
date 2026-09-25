/**
 * Golden Corpus for Story Extraction Testing
 * A collection of test cases with expected outputs to verify AI performance.
 */

export interface ExpectedPerson {
    name: string;
    isNew: boolean;
    // Optional: check for specific ID match if testing against existing DB
    id?: string;
}

export interface ExpectedRelation {
    subjectName: string;
    relationType: string;
    objectLabel: string;
    objectType?: string; // Optional loose matching
}

export interface StoryTestCase {
    id: string;
    description: string;
    story: string;
    existingPeople: Array<{ id: string; name: string }>;
    expected: {
        people: ExpectedPerson[];
        relations: ExpectedRelation[];
        // We can add conflicts/ambiguity expectations later
    };
}

export const TEST_CORPUS: StoryTestCase[] = [
    {
        id: 'simple-likes',
        description: 'Simple story with one person and one preference',
        story: 'Alice loves eating pasta on Sundays.',
        existingPeople: [],
        expected: {
            people: [
                { name: 'Alice', isNew: true }
            ],
            relations: [
                { subjectName: 'Alice', relationType: 'LIKES', objectLabel: 'pasta' },
                { subjectName: 'Alice', relationType: 'REGULARLY_DOES', objectLabel: 'eating pasta on Sundays' } // Or similar variation
            ]
        }
    },
    {
        id: 'existing-person-match',
        description: 'Story referencing an existing person via @mention or name match',
        story: 'I went hiking with @Bob yesterday.',
        existingPeople: [{ id: 'bob-123', name: 'Bob Smith' }],
        expected: {
            people: [
                { name: 'Bob Smith', isNew: false, id: 'bob-123' }
            ],
            relations: [
                // "I" (user) relations are tricky if we don't have "Me" context, usually we skip or infer 'KNOWS' if the subject is external
                // But here @Bob is the object. "USER EXPERIENCED hiking with Bob" -> implied relation?
                // For now let's verify Bob is identified correctly.
            ]
        }
    },
    {
        id: 'conflict-diet',
        description: 'Conflict between vegan diet and eating meat',
        story: 'My friend Sarah keeps saying she is vegan, but she just ordered a steak.',
        existingPeople: [{ id: 'sarah-1', name: 'Sarah' }],
        expected: {
            people: [{ name: 'Sarah', isNew: false, id: 'sarah-1' }],
            relations: [
                { subjectName: 'Sarah', relationType: 'IS', objectLabel: 'vegan' },
                { subjectName: 'Sarah', relationType: 'LIKES', objectLabel: 'steak' } // This should ideally trigger a conflict in the full response, but for extraction we check if it catches the relation.
            ]
        }
    }
];
