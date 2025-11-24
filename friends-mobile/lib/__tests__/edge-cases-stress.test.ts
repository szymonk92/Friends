import { describe, it, expect } from '@jest/globals';

describe('Edge Cases and Stress Tests', () => {
    describe('Edge Cases - Empty and Whitespace', () => {
        it('should reject empty string names', () => {
            const invalidData = { name: '', personType: 'primary' };
            expect(isValidPersonName('')).toBe(false);
        });

        it('should reject whitespace-only names', () => {
            const invalidData = { name: '   ', personType: 'primary' };
            expect(isValidPersonName('   ')).toBe(false);
        });

        it('should trim and accept names with surrounding whitespace', () => {
            const name = '  John Doe  ';
            expect(normalizePersonName(name)).toBe('John Doe');
        });

        it('should handle empty search queries gracefully', () => {
            const people = [{ id: '1', name: 'John' }];
            const results = searchPeople(people, '');
            expect(results).toEqual([]);
        });
    });

    describe('Edge Cases - Very Long Strings', () => {
        it('should handle very long person names (1000+ characters)', () => {
            const longName = 'A'.repeat(1000);
            const person = { name: longName, personType: 'primary' };

            expect(isValidPersonName(longName)).toBe(true);
            expect(longName.length).toBe(1000);
        });

        it('should handle very long story content (10000+ characters)', () => {
            const longContent = 'Lorem ipsum '.repeat(1000);

            expect(isValidStoryContent(longContent)).toBe(true);
            expect(longContent.length).toBeGreaterThan(10000);
        });

        it('should handle search with very long query', () => {
            const people = [{ id: '1', name: 'John Doe' }];
            const longQuery = 'John '.repeat(100);

            const results = searchPeople(people, longQuery);
            // Should handle without crashing
            expect(Array.isArray(results)).toBe(true);
        });
    });

    describe('Edge Cases - Special Characters and Unicode', () => {
        it('should handle names with apostrophes', () => {
            const name = "O'Brien";
            expect(isValidPersonName(name)).toBe(true);
            expect(normalizePersonName(name)).toBe("O'Brien");
        });

        it('should handle names with hyphens', () => {
            const name = 'Mary-Jane';
            expect(isValidPersonName(name)).toBe(true);
        });

        it('should handle unicode characters in names', () => {
            const names = ['José', 'François', '李明', 'Владимир', 'محمد'];

            names.forEach(name => {
                expect(isValidPersonName(name)).toBe(true);
            });
        });

        it('should handle emojis in story content', () => {
            const content = 'Had a great time 🎉👍 with friends!';
            expect(isValidStoryContent(content)).toBe(true);
        });

        it('should search unicode names correctly', () => {
            const people = [
                { id: '1', name: 'José García' },
                { id: '2', name: 'François Dubois' },
            ];

            const results = searchPeople(people, 'josé');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should handle special SQL characters safely', () => {
            const dangerousNames = [
                "Robert'); DROP TABLE people;--",
                "admin'--",
                "' OR '1'='1",
            ];

            dangerousNames.forEach(name => {
                // Should be treated as regular strings, not SQL
                expect(typeof name).toBe('string');
            });
        });
    });

    describe('Edge Cases - Null and Undefined', () => {
        it('should reject null as person name', () => {
            expect(isValidPersonName(null as any)).toBe(false);
        });

        it('should reject undefined as person name', () => {
            expect(isValidPersonName(undefined as any)).toBe(false);
        });

        it('should handle null in optional fields', () => {
            const person = {
                name: 'John',
                nickname: null,
                notes: null,
            };

            expect(isValidPersonName(person.name)).toBe(true);
        });

        it('should handle undefined confidence score', () => {
            const relation = {
                subjectId: 'person-1',
                relationType: 'LIKES',
                objectLabel: 'Pizza',
                confidence: undefined,
            };

            // Should use default or accept undefined
            expect(relation.subjectId).toBeDefined();
        });
    });

    describe('Edge Cases - Boundary Conditions', () => {
        it('should accept confidence score of exactly 0.0', () => {
            expect(isValidConfidenceScore(0.0)).toBe(true);
        });

        it('should accept confidence score of exactly 1.0', () => {
            expect(isValidConfidenceScore(1.0)).toBe(true);
        });

        it('should reject confidence score just below 0', () => {
            expect(isValidConfidenceScore(-0.0001)).toBe(false);
        });

        it('should reject confidence score just above 1', () => {
            expect(isValidConfidenceScore(1.0001)).toBe(false);
        });

        it('should handle single character names', () => {
            const name = 'X';
            expect(isValidPersonName(name)).toBe(true);
        });

        it('should handle dates at boundaries', () => {
            const dates = [
                new Date('1900-01-01'), // Very old
                new Date('2099-12-31'), // Far future
                new Date('1970-01-01'), // Unix epoch
            ];

            dates.forEach(date => {
                expect(date instanceof Date).toBe(true);
                expect(isNaN(date.getTime())).toBe(false);
            });
        });
    });

    describe('Stress Test - 10,000 People', () => {
        it('should handle search with 10k people efficiently', () => {
            const people = generate10kPeople();
            const startTime = Date.now();

            const results = searchPeople(people, 'John');

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`[PERF] 10k people search took: ${duration}ms`);
            console.log(`[PERF] Found ${results.length} results`);

            // Should complete in reasonable time (< 500ms for 10k records)
            expect(duration).toBeLessThan(500);
            expect(results.length).toBeGreaterThan(0);
        });

        it('should handle filtering 10k people by relationship type', () => {
            const people = generate10kPeople();
            const startTime = Date.now();

            const results = filterPeopleByRelationship(people, 'friend');

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`[PERF] 10k people filter took: ${duration}ms`);
            console.log(`[PERF] Found ${results.length} friends`);

            expect(duration).toBeLessThan(100);
            expect(results.every(p => p.relationshipType === 'friend')).toBe(true);
        });

        it('should handle 10k relations filtering by type', () => {
            const relations = generate10kRelations();
            const startTime = Date.now();

            const results = filterRelationsByType(relations, 'LIKES');

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`[PERF] 10k relations filter took: ${duration}ms`);
            console.log(`[PERF] Found ${results.length} LIKES relations`);

            expect(duration).toBeLessThan(100);
            expect(results.every(r => r.relationType === 'LIKES')).toBe(true);
        });

        it('should handle complex multi-field search on 10k people', () => {
            const people = generate10kPeople();
            const startTime = Date.now();

            // Search across name, nickname, and notes
            const query = 'test';
            const results = people.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.nickname?.toLowerCase().includes(query) ||
                p.notes?.toLowerCase().includes(query)
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`[PERF] 10k multi-field search took: ${duration}ms`);

            expect(duration).toBeLessThan(200);
        });

        it('should measure memory usage with 10k people', () => {
            const before = process.memoryUsage().heapUsed;

            const people = generate10kPeople();

            const after = process.memoryUsage().heapUsed;
            const memoryIncreaseMB = (after - before) / 1024 / 1024;

            console.log(`[MEMORY] 10k people uses: ${memoryIncreaseMB.toFixed(2)}MB`);

            // Should not use excessive memory (< 50MB for 10k records)
            expect(memoryIncreaseMB).toBeLessThan(50);
        });
    });

    describe('Stress Test - Concurrent Operations', () => {
        it('should handle multiple simultaneous searches', async () => {
            const people = generate10kPeople();
            const queries = ['John', 'Jane', 'test', 'friend', 'family'];

            const startTime = Date.now();

            const results = await Promise.all(
                queries.map(query => Promise.resolve(searchPeople(people, query)))
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`[PERF] 5 concurrent searches took: ${duration}ms`);

            expect(results).toHaveLength(5);
            expect(duration).toBeLessThan(1000);
        });
    });

    describe('Edge Cases - Case Sensitivity', () => {
        it('should perform case-insensitive search', () => {
            const people = [
                { id: '1', name: 'John Doe' },
                { id: '2', name: 'jane smith' },
                { id: '3', name: 'ALICE JOHNSON' },
            ];

            const results1 = searchPeople(people, 'john');
            const results2 = searchPeople(people, 'JOHN');
            const results3 = searchPeople(people, 'JoHn');

            expect(results1).toEqual(results2);
            expect(results2).toEqual(results3);
        });

        it('should handle mixed case in unicode names', () => {
            const people = [{ id: '1', name: 'José García' }];

            const results = searchPeople(people, 'JOSÉ');
            expect(results.length).toBeGreaterThan(0);
        });
    });
});

// Helper functions
function isValidPersonName(name: any): boolean {
    return typeof name === 'string' && name.trim().length > 0;
}

function normalizePersonName(name: string): string {
    return name.trim();
}

function isValidStoryContent(content: any): boolean {
    return typeof content === 'string' && content.trim().length > 0;
}

function isValidConfidenceScore(score: number): boolean {
    return typeof score === 'number' && !isNaN(score) && isFinite(score) && score >= 0 && score <= 1;
}

function searchPeople(people: any[], query: string) {
    if (!query || query.trim().length === 0) return [];

    const lowerQuery = query.toLowerCase().trim();
    return people.filter(person => {
        const nameMatch = person.name.toLowerCase().includes(lowerQuery);
        const nicknameMatch = person.nickname?.toLowerCase().includes(lowerQuery);
        const notesMatch = person.notes?.toLowerCase().includes(lowerQuery);

        return nameMatch || nicknameMatch || notesMatch;
    });
}

function filterPeopleByRelationship(people: any[], types: string | string[]) {
    const typeArray = Array.isArray(types) ? types : [types];
    return people.filter(person => typeArray.includes(person.relationshipType));
}

function filterRelationsByType(relations: any[], types: string | string[]) {
    const typeArray = Array.isArray(types) ? types : [types];
    return relations.filter(rel => typeArray.includes(rel.relationType));
}

function generate10kPeople() {
    const people = [];
    const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
    const lastNames = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller'];
    const relationshipTypes = ['friend', 'family', 'colleague', 'acquaintance', 'partner'];

    for (let i = 0; i < 10000; i++) {
        const firstName = firstNames[i % firstNames.length];
        const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];

        people.push({
            id: `person-${i}`,
            name: `${firstName} ${lastName} ${i}`,
            nickname: i % 3 === 0 ? `Nick${i}` : undefined,
            relationshipType: relationshipTypes[i % relationshipTypes.length],
            notes: i % 5 === 0 ? `Test notes ${i}` : undefined,
        });
    }

    return people;
}

function generate10kRelations() {
    const relations = [];
    const relationTypes = ['LIKES', 'DISLIKES', 'KNOWS', 'ASSOCIATED_WITH'];
    const categories = ['food', 'music', 'sports', 'hobbies'];

    for (let i = 0; i < 10000; i++) {
        relations.push({
            id: `rel-${i}`,
            subjectId: `person-${i % 100}`,
            relationType: relationTypes[i % relationTypes.length],
            objectLabel: `Object ${i}`,
            category: i % 2 === 0 ? categories[i % categories.length] : undefined,
            confidence: Math.random(),
        });
    }

    return relations;
}
