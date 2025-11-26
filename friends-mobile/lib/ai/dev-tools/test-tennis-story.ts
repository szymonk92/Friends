/**
 * Test Script: Tennis Story Ambiguity
 * 
 * Run with: npx ts-node lib/ai/dev-tools/test-tennis-story.ts
 * 
 * This script tests the actual AI behavior with ambiguous names
 */

import { extractRelationsFromStorySession } from '../extraction';
import type { AIServiceConfig } from '../ai-service';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// Test data
const existingPeople = [
    { id: 'david-1', name: 'David Smith' },
    { id: 'ola-1', name: 'Ola Kowalska' },
];

const tennisStory = `Played tennis on Tuesday with Falko, David, and Ola. Our trainer was David.`;

async function runTest() {
    console.log('=== TENNIS STORY AMBIGUITY TEST ===\n');
    console.log('Story:', tennisStory);
    console.log('\nExisting People:');
    existingPeople.forEach(p => console.log(`  - ${p.name} (${p.id})`));
    console.log('\n' + '='.repeat(50) + '\n');

    if (!ANTHROPIC_KEY && !GEMINI_KEY) {
        console.error('ERROR: No API key found. Set ANTHROPIC_API_KEY or GEMINI_API_KEY environment variable.');
        return;
    }

    const config: AIServiceConfig = {
        model: ANTHROPIC_KEY ? 'claude-3-5-sonnet-20241022' : 'gemini-2.0-flash-exp',
        apiKey: ANTHROPIC_KEY || GEMINI_KEY,
    };

    console.log(`Using model: ${config.model}\n`);

    try {
        const result = await extractRelationsFromStorySession(
            tennisStory,
            existingPeople,
            config
        );

        console.log('=== AI RESPONSE ===\n');
        console.log('People Extracted:');
        result.people.forEach(p => {
            console.log(`  - ${p.name} (${p.id}) - isNew: ${p.isNew}, confidence: ${p.confidence}`);
        });

        console.log('\nRelations Extracted:');
        result.relations.forEach(r => {
            console.log(`  - ${r.subjectName}: ${r.relationType} "${r.objectLabel}"`);
        });

        console.log('\nAmbiguous Matches:');
        if (result.ambiguousMatches && result.ambiguousMatches.length > 0) {
            result.ambiguousMatches.forEach(am => {
                console.log(`  - "${am.nameInStory}":`);
                am.possibleMatches.forEach(pm => {
                    console.log(`      → ${pm.name} (${pm.id}) - ${pm.reason}`);
                });
            });
        } else {
            console.log('  (none)');
        }

        console.log('\n' + '='.repeat(50) + '\n');
        console.log('=== ANALYSIS ===\n');

        // Check critical behaviors
        console.log('✓ Checks:');

        const falkoFound = result.people.find(p => p.name.toLowerCase().includes('falko'));
        console.log(`  ${falkoFound ? '✅' : '❌'} Falko created as NEW person: ${!!falkoFound}`);

        const davidAmbiguous = result.ambiguousMatches?.find(am => am.nameInStory.toLowerCase().includes('david'));
        console.log(`  ${davidAmbiguous ? '✅' : '❌'} David flagged as ambiguous: ${!!davidAmbiguous}`);

        const olaAmbiguous = result.ambiguousMatches?.find(am => am.nameInStory.toLowerCase().includes('ola'));
        console.log(`  ${olaAmbiguous ? '✅' : '❌'} Ola flagged as ambiguous: ${!!olaAmbiguous}`);

        const davidInPeople = result.people.find(p => p.name.toLowerCase().includes('david') && !p.isNew);
        console.log(`  ${!davidInPeople ? '✅' : '❌'} David NOT auto-linked to existing: ${!davidInPeople}`);

        const olaInPeople = result.people.find(p => p.name.toLowerCase().includes('ola') && !p.isNew);
        console.log(`  ${!olaInPeople ? '✅' : '❌'} Ola NOT auto-linked to existing: ${!olaInPeople}`);

        console.log('\n' + '='.repeat(50) + '\n');
        console.log('Raw JSON Response:');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('ERROR:', error);
    }
}

runTest();
