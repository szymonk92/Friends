/**
 * Brain-dump extraction test runner.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx ts-node lib/ai/dev-tools/run-brain-dump-tests.ts anthropic
 *   GEMINI_API_KEY=...    npx ts-node lib/ai/dev-tools/run-brain-dump-tests.ts gemini
 *
 * Optional flags:
 *   --only=<id>     run a single test case
 *   --category=<x>  run a category (baseline | idempotency | update | partner-change | ...)
 *   --json          emit machine-readable JSON instead of pretty output
 *
 * Notes:
 *   - This calls the real AI provider, so it's an integration test, not a unit test.
 *   - The diff layer itself is unit-tested in lib/ai/__tests__/brain-dump-diff.test.ts.
 *   - We expect probabilistic small failures across runs — track regressions across many.
 */

import { extractPersonBrainDump } from '../brain-dump';
import { diffBrainDump } from '../brain-dump-diff';
import {
  BRAIN_DUMP_CORPUS,
  attributesIncludeAny,
  attributesIncludeAll,
  flattenForbiddenSearch,
  type CorpusCase,
  type FieldKey,
} from './brain-dump-corpus';
import type { AIServiceConfig, AIModel } from '../ai-service';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(msg: string, color: string = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

type CaseFinding =
  | { kind: 'pass'; assertion: string }
  | { kind: 'fail'; assertion: string; got: string };

async function runCase(c: CorpusCase, config: AIServiceConfig): Promise<CaseFinding[]> {
  const findings: CaseFinding[] = [];
  const result = await extractPersonBrainDump(config, c.note, c.personName);

  // ---- field assertions
  const e = c.expected;
  if (e.fields) {
    for (const [k, pattern] of Object.entries(e.fields) as Array<[FieldKey, RegExp | undefined]>) {
      const value = result[k];
      if (pattern === undefined) {
        // explicit "must be absent"
        if (!value) findings.push({ kind: 'pass', assertion: `${k} absent` });
        else findings.push({ kind: 'fail', assertion: `${k} should be absent`, got: String(value) });
      } else {
        if (typeof value === 'string' && pattern.test(value)) {
          findings.push({ kind: 'pass', assertion: `${k} matches ${pattern}` });
        } else {
          findings.push({
            kind: 'fail',
            assertion: `${k} should match ${pattern}`,
            got: typeof value === 'string' ? value : '(missing)',
          });
        }
      }
    }
  }

  if (e.socialPlatforms) {
    const present = new Set(result.socialHandles.map((s) => s.platform));
    for (const p of e.socialPlatforms) {
      if (present.has(p as never)) findings.push({ kind: 'pass', assertion: `social ${p}` });
      else findings.push({ kind: 'fail', assertion: `social ${p}`, got: '(missing)' });
    }
  }

  if (e.languagesIncludeAny) {
    const lower = result.languages.map((l) => l.toLowerCase());
    const hit = e.languagesIncludeAny.find((l) => lower.includes(l.toLowerCase()));
    if (hit) findings.push({ kind: 'pass', assertion: `languages include ${hit}` });
    else
      findings.push({
        kind: 'fail',
        assertion: `languages should include any of ${e.languagesIncludeAny.join(', ')}`,
        got: result.languages.join(', ') || '(none)',
      });
  }

  if (e.attributesIncludeAny) {
    if (attributesIncludeAny(result, e.attributesIncludeAny)) {
      findings.push({ kind: 'pass', assertion: `attributes include any of ${e.attributesIncludeAny.join(', ')}` });
    } else {
      findings.push({
        kind: 'fail',
        assertion: `attributes should include any of ${e.attributesIncludeAny.join(', ')}`,
        got: result.attributes.map((a) => a.objectLabel).join(' | ') || '(none)',
      });
    }
  }

  if (e.attributesIncludeAll) {
    if (attributesIncludeAll(result, e.attributesIncludeAll)) {
      findings.push({ kind: 'pass', assertion: `attributes include all of ${e.attributesIncludeAll.join(', ')}` });
    } else {
      findings.push({
        kind: 'fail',
        assertion: `attributes should include all of ${e.attributesIncludeAll.join(', ')}`,
        got: result.attributes.map((a) => a.objectLabel).join(' | ') || '(none)',
      });
    }
  }

  if (typeof e.minAttributes === 'number') {
    if (result.attributes.length >= e.minAttributes)
      findings.push({ kind: 'pass', assertion: `≥ ${e.minAttributes} attributes` });
    else
      findings.push({
        kind: 'fail',
        assertion: `expected ≥ ${e.minAttributes} attributes`,
        got: String(result.attributes.length),
      });
  }
  if (typeof e.maxAttributes === 'number') {
    if (result.attributes.length <= e.maxAttributes)
      findings.push({ kind: 'pass', assertion: `≤ ${e.maxAttributes} attributes` });
    else
      findings.push({
        kind: 'fail',
        assertion: `expected ≤ ${e.maxAttributes} attributes`,
        got: String(result.attributes.length),
      });
  }

  if (e.mustNotMention) {
    const haystack = flattenForbiddenSearch(result);
    for (const forbidden of e.mustNotMention) {
      const lc = forbidden.toLowerCase();
      if (haystack.includes(lc)) {
        findings.push({
          kind: 'fail',
          assertion: `must not mention "${forbidden}"`,
          got: snippetAround(haystack, lc),
        });
      } else {
        findings.push({ kind: 'pass', assertion: `not mentioning "${forbidden}"` });
      }
    }
  }

  if (e.mentionedOthersIncludeAny) {
    const lower = result.mentionedOthers.map((m) => m.toLowerCase());
    const hit = e.mentionedOthersIncludeAny.find((m) => lower.includes(m.toLowerCase()));
    if (hit) findings.push({ kind: 'pass', assertion: `mentionedOthers includes ${hit}` });
    else
      findings.push({
        kind: 'fail',
        assertion: `mentionedOthers should include any of ${e.mentionedOthersIncludeAny.join(', ')}`,
        got: result.mentionedOthers.join(', ') || '(none)',
      });
  }

  // ---- diff classification (idempotency / update / conflict)
  if (e.diffClass) {
    const diff = diffBrainDump(result, c.existing ?? {});
    for (const [k, expectedClass] of Object.entries(e.diffClass) as Array<[FieldKey, string]>) {
      const fieldDiff =
        k === 'partnerName'
          ? diff.partner
          : k === 'metLocation'
          ? diff.metLocation
          : k === 'metDate'
          ? diff.metDate
          : k === 'homeLocation'
          ? diff.homeLocation
          : k === 'phone'
          ? diff.phone
          : k === 'email'
          ? diff.email
          : undefined;
      const got = fieldDiff?.class ?? '(none)';
      if (got === expectedClass) {
        findings.push({ kind: 'pass', assertion: `diff[${k}] = ${expectedClass}` });
      } else {
        findings.push({
          kind: 'fail',
          assertion: `diff[${k}] should be ${expectedClass}`,
          got,
        });
      }
    }
  }

  return findings;
}

function snippetAround(haystack: string, needle: string): string {
  const idx = haystack.indexOf(needle);
  if (idx < 0) return needle;
  const start = Math.max(0, idx - 20);
  const end = Math.min(haystack.length, idx + needle.length + 20);
  return `…${haystack.slice(start, end)}…`;
}

async function main() {
  const args = process.argv.slice(2);
  const model = (args.find((a) => !a.startsWith('--')) as AIModel) ?? 'gemini';
  const onlyId = args.find((a) => a.startsWith('--only='))?.split('=')[1];
  const onlyCat = args.find((a) => a.startsWith('--category='))?.split('=')[1];
  const json = args.includes('--json');

  const apiKey =
    model === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log(`Set ${model === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY'}`, colors.red);
    process.exit(1);
  }

  const cases = BRAIN_DUMP_CORPUS.filter((c) =>
    onlyId ? c.id === onlyId : onlyCat ? c.category === onlyCat : true
  );

  const config: AIServiceConfig = { model, apiKey };
  const report: Array<{ id: string; category: string; pass: number; fail: number; findings: CaseFinding[] }> = [];

  for (const c of cases) {
    if (!json) log(`\n[${c.category}] ${c.id} — ${c.description}`, colors.blue);
    try {
      const findings = await runCase(c, config);
      const pass = findings.filter((f) => f.kind === 'pass').length;
      const fail = findings.filter((f) => f.kind === 'fail').length;
      report.push({ id: c.id, category: c.category, pass, fail, findings });
      if (!json) {
        for (const f of findings) {
          if (f.kind === 'pass') log(`  ✓ ${f.assertion}`, colors.green);
          else log(`  ✗ ${f.assertion}\n      got: ${f.got}`, colors.red);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.push({
        id: c.id,
        category: c.category,
        pass: 0,
        fail: 1,
        findings: [{ kind: 'fail', assertion: 'extraction threw', got: message }],
      });
      if (!json) log(`  ✗ extraction threw: ${message}`, colors.red);
    }
  }

  if (json) {
    console.log(JSON.stringify({ model, report }, null, 2));
    return;
  }

  const totalPass = report.reduce((n, r) => n + r.pass, 0);
  const totalFail = report.reduce((n, r) => n + r.fail, 0);
  log(`\n${colors.bold}Summary (${model}):${colors.reset}  ${colors.green}${totalPass} pass${colors.reset}  ${
    totalFail > 0 ? colors.red : colors.dim
  }${totalFail} fail${colors.reset}`);

  // Per-category roll-up
  const cats = new Set(report.map((r) => r.category));
  for (const cat of cats) {
    const subset = report.filter((r) => r.category === cat);
    const p = subset.reduce((n, r) => n + r.pass, 0);
    const f = subset.reduce((n, r) => n + r.fail, 0);
    log(`  ${cat.padEnd(18, ' ')} ${p}p / ${f}f`, f > 0 ? colors.yellow : colors.dim);
  }

  if (totalFail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
