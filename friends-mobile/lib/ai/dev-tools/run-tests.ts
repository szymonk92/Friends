/**
 * Story Extraction Test Runner
 *
 * Usage:
 * npx ts-node lib/ai/dev-tools/run-tests.ts [model]
 *
 * Models: 'anthropic', 'gemini' (default), 'gemini-1.5-flash', 'gemini-1.5-pro'
 *
 * Env vars required:
 * - ANTHROPIC_API_KEY (if using claude)
 * - GEMINI_API_KEY (if using gemini)
 */

import { extractRelationsFromStorySession, ExtractionResult } from '../extraction';
import { TEST_CORPUS, StoryTestCase } from './test-corpus';
import { AIServiceConfig, AIModel } from '../ai-service';

// Simple color logging
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

function log(msg: string, color: string = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
}

async function runTest(testCase: StoryTestCase, config: AIServiceConfig): Promise<{ passed: boolean; details: string[] }> {
    log(`\nRunning test: [${testCase.id}] ${testCase.description}`, colors.blue);

    try {
        const result = await extractRelationsFromStorySession(
            testCase.story,
            testCase.existingPeople,
            config
        );

        let correct = true;
        const details: string[] = [];

        // 1. Verify People
        testCase.expected.people.forEach(expectedPerson => {
            const found = result.people.find(p => p.name.includes(expectedPerson.name)); // Loose name matching
            if (!found) {
                correct = false;
                details.push(`${colors.red}Missing expected person: ${expectedPerson.name}${colors.reset}`);
            } else {
                if (expectedPerson.isNew !== found.isNew) {
                    correct = false;
                    details.push(`${colors.red}Person ${found.name}: expected isNew=${expectedPerson.isNew}, got ${found.isNew}${colors.reset}`);
                }
                if (expectedPerson.id && found.id !== expectedPerson.id) {
                    correct = false;
                    details.push(`${colors.red}Person ${found.name}: expected ID=${expectedPerson.id}, got ${found.id}${colors.reset}`);
                }
            }
        });

        // Check for false positives (people extracted but not expected)
        // This relies on the corpus being complete!
        result.people.forEach(foundPerson => {
            const expected = testCase.expected.people.find(p => foundPerson.name.includes(p.name));
            if (!expected) {
                // Warn for now, don't fail, might be "Mentioned" people vs "Primary"
                details.push(`${colors.yellow}Warning: Unexpected person found: ${foundPerson.name}${colors.reset}`);
            }
        });

        // 2. Verify Relations
        testCase.expected.relations.forEach(expectedRel => {
            const found = result.relations.find(r =>
                r.subjectName.includes(expectedRel.subjectName) &&
                r.relationType === expectedRel.relationType &&
                r.objectLabel.toLowerCase().includes(expectedRel.objectLabel.toLowerCase())
            );

            if (!found) {
                correct = false;
                details.push(`${colors.red}Missing relation: ${expectedRel.subjectName} ${expectedRel.relationType} ${expectedRel.objectLabel}${colors.reset}`);
                // Try to find partial match for debugging
                const partial = result.relations.find(r => r.relationType === expectedRel.relationType);
                if (partial) {
                    details.push(`${colors.yellow}  (Found similar: ${partial.subjectName} ${partial.relationType} ${partial.objectLabel})${colors.reset}`);
                }
            }
        });

        if (correct) {
            log(`PASSED`, colors.green);
        } else {
            log(`FAILED`, colors.red);
            details.forEach(d => console.log(d));
        }

        return { passed: correct, details };

    } catch (e) {
        log(`ERROR running test: ${(e as Error).message}`, colors.red);
        return { passed: false, details: [(e as Error).message] };
    }
}

async function main() {
    const args = process.argv.slice(2);
    const modelArg = args[0] as AIModel || 'gemini'; // Default to gemini (2.0 flash lite)

    console.log(`Starting Test Runner with Model: ${modelArg}`);

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let apiKey = '';
    if (modelArg === 'anthropic') {
        if (!anthropicKey) {
            console.error('Error: ANTHROPIC_API_KEY not set');
            process.exit(1);
        }
        apiKey = anthropicKey;
    } else {
        if (!geminiKey) {
            console.error('Error: GEMINI_API_KEY not set');
            process.exit(1);
        }
        apiKey = geminiKey;
    }

    const config: AIServiceConfig = {
        model: modelArg,
        apiKey: apiKey
    };

    let passedCount = 0;

    for (const testCase of TEST_CORPUS) {
        const result = await runTest(testCase, config);
        if (result.passed) passedCount++;
    }

    console.log('\n' + '='.repeat(30));
    const passRate = (passedCount / TEST_CORPUS.length) * 100;
    log(`Total Tests: ${TEST_CORPUS.length}`);
    log(`Passed: ${passedCount}`);
    const color = passRate === 100 ? colors.green : (passRate > 50 ? colors.yellow : colors.red);
    log(`Pass Rate: ${passRate.toFixed(1)}%`, color);
    console.log('='.repeat(30));
}

main().catch(console.error);
