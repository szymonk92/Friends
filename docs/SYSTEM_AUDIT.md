# System Audit & Improvement Plan — Friends

**Date:** 2026-08-31
**Scope:** `friends-mobile/` (Expo app), `.github/workflows/ci.yml`, root docs
**Commit audited:** `583ca88`
**Method:** full read of the ~5,500 LOC application source, plus a real `npm ci` +
`typecheck` / `lint` / `jest` / `prettier` run in a clean container. Every claim below
that is marked *verified* was reproduced by running the code or the tool, not inferred.

---

## 0. Executive summary

The design documentation in `docs/` (≈600 KB across 23 files) is genuinely strong. The
implementation is roughly 30% of the way to matching it, and **the app currently cannot
complete its core loop end to end.** Three independent defects each break it on their own:

1. Only the `users` table is ever created at runtime. Every other table — `people`,
   `relations`, `stories`, `pending_extractions` — is never created on device.
2. `randomUUID` is used without being imported in `hooks/useStories.ts`, so saving a
   story throws `ReferenceError`.
3. The People list screen never queries the database; it is hardcoded to render an
   empty array.

All four CI gates are red on `main`, so none of this was caught. The good news is that
these are shallow bugs sitting on top of a well-shaped schema and a genuinely
interesting conflict-detection engine — the fix list is short and mostly mechanical.

### Severity roll-up

| # | Area | Finding | Severity |
|---|------|---------|----------|
| D1 | DB | Only `users` is created at runtime; migrations never applied | 🔴 Blocker |
| C3 | Build | `randomUUID` not imported — story save + seeder throw at runtime | 🔴 Blocker |
| U1 | UI | People list is a hardcoded empty stub | 🔴 Blocker |
| C1 | CI | All four CI gates fail on `main` | 🔴 Blocker |
| A2 | Security | Anthropic API key stored in plaintext `AsyncStorage` | 🟠 High |
| A3 | Security | `.env` is not git-ignored while `.env.example` tells you to create it | 🟠 High |
| A8 | Security | Story text interpolated raw into the prompt (injection surface) | 🟠 High |
| P1 | Privacy | Third parties' health/belief data sent to an API, against README's promise | 🟠 High |
| D3 | DB | `PRAGMA foreign_keys` never enabled — every cascade is inert | 🟠 High |
| D4 | DB | No transactions anywhere; extraction writes are non-atomic | 🟠 High |
| U2 | UI | `/dev` "Clear All Data" ships in production builds, deep-linkable | 🟠 High |
| A12 | AI | 1,300-line conflict engine is dead code; conflicts are counted then dropped | 🟠 High |
| C4/C5 | Testing | 65% of source unlinted, hooks/components untestable, 0% real coverage | 🟠 High |
| A4/A5 | AI | Legacy model pinned; no prompt caching; no schema validation of output | 🟡 Medium |
| D13 | DB | No export/backup in a local-first app — uninstall = total data loss | 🟡 Medium |
| U6 | UI | Zero accessibility attributes in the entire codebase | 🟡 Medium |
| X1 | Docs | Root README describes a different product (Electron + RDF + proxy) | 🟡 Medium |

---

## 1. Verified state of the build

Run in a clean container after `npm ci` (exit 0):

```
$ npx tsc --noEmit
hooks/useStories.ts(51,15): error TS2304: Cannot find name 'randomUUID'.
lib/db/seed.ts(17,13):  error TS2304: Cannot find name 'randomUUID'.     [×12 in this file]
tsconfig.json(2,14):    error TS6053: File 'expo/tsconfig' not found.

$ npm run lint          → ✖ 4 problems (0 errors, 4 warnings), fails on --max-warnings 0
$ npm run test:ci       → Test Suites: 1 failed, 1 total | Tests: 0 total | Coverage: 0%
$ npm run format:check  → Code style issues in 4 files
```

**Nothing in CI is currently green.** Two of the four failures share one root cause:
`tsconfig.json` extends `"expo/tsconfig"`, but the package ships `expo/tsconfig.base`.
That single typo breaks `tsc` *and* every `ts-jest` run, which is why the one existing
test suite reports zero tests instead of failing loudly.

---

## 2. Database & data layer

### D1 — Runtime schema is one table. 🔴 Blocker
`lib/db/index.ts:16-33` hand-writes a `CREATE TABLE IF NOT EXISTS users (...)` and
stops there. `lib/db/migrations/` contains two correct, generated migrations covering
all twelve tables — and nothing ever executes them. There is no
`useMigrations`/`migrate` from `drizzle-orm/expo-sqlite/migrator`, and no
`babel-plugin-inline-import` to bundle the `.sql` files (`metro.config.js:6` adds `sql`
to `assetExts`, but no module imports them). Every screen that touches `people`,
`relations`, `stories`, or `pending_extractions` fails with `no such table` — and the
failure is swallowed, because `initializeDatabase` catches and logs (`lib/db/index.ts:37`).

> **Fix:** `npx drizzle-kit generate` produces `migrations/migrations.js`; add
> `babel-plugin-inline-import` for `.sql`, then call `useMigrations(db, migrations)`
> in `app/_layout.tsx` and render a real error screen when it rejects. Delete the
> hand-written DDL so `schema.ts` is the single source of truth — today it has already
> drifted (the hand-written `users.email` lacks the `UNIQUE` that `schema.ts:12` declares).

### D3 — Foreign keys are inert. 🟠 High
SQLite defaults `foreign_keys` to **OFF**, and no `PRAGMA foreign_keys = ON` exists
anywhere in the codebase. Every `ON DELETE cascade` in the migrations and every
`references()` in `schema.ts` is decorative. Hard-deleting a person orphans its
relations, contact events, secrets, and pending extractions permanently.

Independently: soft-deleting a person (`useDeletePerson`, `hooks/usePeople.ts:95`) sets
only `people.deletedAt` and does not touch that person's relations, so `useRelations()`
keeps returning relations belonging to a deleted person.

> **Fix:** `expoDb.execSync('PRAGMA foreign_keys = ON;')` at open, plus a soft-delete
> helper that cascades `deletedAt` to dependent rows inside one transaction.

### D4 — No transactions. 🟠 High
`hooks/useExtraction.ts:60-167` performs, in a loop and un-wrapped: N person inserts,
N person updates, a bulk relation insert, a pending-extractions insert, and a story
update. Any failure mid-way leaves the DB in a partial state with the story still marked
unprocessed, so a retry re-creates the same people. `useApprovePendingExtraction`
(`hooks/usePendingExtractions.ts:71-96`) likewise inserts a relation then updates the
review status as two independent statements — a crash between them silently duplicates
the relation on retry.

> **Fix:** wrap each multi-statement mutation in `db.transaction(...)`. Make extraction
> idempotent by keying on `storyId` so a retry is safe.

### D5 — `getCurrentUserId()` is called on every query, and lies on failure. 🟠 High
Every hook (`usePeople`, `useStories`, `useRelations`, `usePendingExtractions`) awaits a
fresh `SELECT id FROM users LIMIT 1` before its real query. Worse, all three error paths
in `lib/db/index.ts:64,80` **return a brand-new random UUID**. Under any transient error
the app writes rows owned by a user that does not exist — data that is silently
invisible forever after and impossible to distinguish from a fresh install.

> **Fix:** resolve the local user once at startup, hold it in a Zustand store or React
> context, and make the error path *throw* rather than fabricate an identity.

### D6 — Local-user creation races
`initializeLocalUser` does check-then-insert with no uniqueness guard
(`lib/db/index.ts:43-66`). Two concurrent callers — trivially reachable, since several
hooks call `getCurrentUserId()` in parallel on first render — create two local users,
after which half the data is owned by the wrong one.

### D8 — JSON-in-TEXT columns will not scale
`stories.peopleIds`, `stories.extractedData`, `events.guestIds`,
`people.potentialDuplicates`, and `relations.metadata` are all JSON blobs in `TEXT`
columns. None are validated on write, none are queryable. "Which stories mention Emma?"
— the app's second-most obvious query — requires loading and parsing every story row.

> **Fix:** a `story_people` join table for the one that matters (stories ↔ people);
> keep genuinely free-form payloads (`metadata`) as JSON but validate with the Zod
> schemas that already exist in `lib/validation/schemas.ts`.

### D9 — Index set doesn't match the query shapes
Every list query filters `isNull(deletedAt)` and orders by `updatedAt`, but no index
covers either. The existing single-column indexes on `user_id`/`status` can't serve
`WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`.

> **Fix:** partial/composite indexes, e.g.
> `CREATE INDEX people_active_idx ON people(user_id, updated_at DESC) WHERE deleted_at IS NULL;`

### D10 — Server-auth tables shipped into an on-device DB
`sessions` and `magic_link_tokens` (`schema.ts:35-69`) model server-side magic-link
auth — IP addresses, user agents, session tokens — in a database that lives entirely on
the user's phone, in an app with no login. They are never read or written. Dead schema
surface that invites someone to store a bearer token in plaintext SQLite later.

### D11 — `secrets` promises encryption that does not exist
`secrets.encryptedContent` / `encryptionSalt` (`schema.ts:312-313`) are `NOT NULL`
columns with no encryption code anywhere in the repo — a `grep` for `encrypt`/`digest`
returns only these two column names and a comment about lactose. Nothing writes to the
table today; the risk is that the column names read as a guarantee and someone stores
plaintext in them.

> **Fix:** either implement it (derive a key via `expo-crypto` + a passphrase held in
> `expo-secure-store`, AES-GCM per row, salt per row) or drop the table until it's real.

### D12 — No WAL, no busy timeout
No `PRAGMA journal_mode = WAL` or `busy_timeout`. During AI extraction the app issues a
burst of writes while the UI reads; on the default rollback journal that's avoidable
`SQLITE_BUSY` contention.

### D13 — Local-first with no way to get your data out. 🟡 Medium
No export, no import, no backup. The database lives in the app sandbox, so an uninstall
or a lost phone is total, unrecoverable loss of exactly the data the product asks users
to invest years into. `expo-file-system` and `expo-document-picker` are already
installed for this and unused.

> **Fix (pre-launch, not post):** a "Export my data" action writing a JSON or SQLite
> file via the share sheet, and a matching import. Later: encrypted auto-backup.

### D14 — Sync columns with no sync semantics
`syncVersion`, `lastSyncedAt`, `syncToken` exist on every table but nothing maintains
them, and `useDeletePerson` doesn't even bump `updatedAt` when it soft-deletes. Any
future last-write-wins sync would mis-order deletions on day one. Also, the local user
id is a per-device random UUID, so the *same human* on two devices is two users — decide
now whether the sync identity is the device or an account.

### D15 — Duplicate people will accumulate, and the dedupe code is dead
`calculateDuplicateConfidence()` (`lib/ai/extraction.ts:167`) is never called.
`people.canonicalId`, `mergedFrom`, and `potentialDuplicates` are never written. The
extraction flow creates a new person whenever the model says `isNew: true`
(`useExtraction.ts:61`), trusting the model's own de-duplication entirely. "Emma",
"Emma R.", and "Em" become three people, and there is no merge UI to recover.

---

## 3. AI integration & server connections

### A1 — There is no server, and the README says there is. 🟠 High
`lib/ai/extraction.ts:65` constructs `new Anthropic({ apiKey })` **on the device** and
calls `api.anthropic.com` directly with the end user's own key. The root README promises
an "Optional AI proxy for API key protection" and a `server/` directory with
`npm run proxy` — neither exists in the repository.

Consequences of the direct-from-device design: the key is on the device, there is no
rate limiting, no spend ceiling, no central revocation, no abuse control, and no
telemetry when extraction fails for a user.

> **Fix (staged):** short term, be honest in the docs that this is bring-your-own-key.
> Medium term, build the thin proxy the docs already specify — it needs to do exactly
> three things: hold the key, enforce a per-user quota, and store nothing.

### A2 — API key in plaintext `AsyncStorage`. 🟠 High
`store/useSettings.ts:22` writes the key with `AsyncStorage.setItem`. On Android that is
an unencrypted SQLite file in app storage; on iOS an unencrypted plist — both readable on
a rooted/jailbroken device and both liable to end up in unencrypted device backups.
`expo-secure-store` (Keychain / Android Keystore) is **already a dependency and entirely
unused**, and `jest.setup.js:16` even mocks it.

> **Fix:** swap the three calls in `useSettings.ts` to `SecureStore.setItemAsync` /
> `getItemAsync` / `deleteItemAsync`, add a "remove key" action, and migrate any existing
> AsyncStorage value on first launch.

### A3 — `.env` is not git-ignored. 🟠 High
`friends-mobile/.env.example` instructs `ANTHROPIC_API_KEY=...`, but
`friends-mobile/.gitignore:36` only ignores `.env*.local`, and the root `.gitignore`
mentions no env files at all. The documented setup path leads straight to a committed
API key.

> **Fix:** add `.env` and `.env*` (with `!.env.example`) to both `.gitignore` files, and
> enable GitHub push protection / secret scanning on the repo.

### A4 — Model is pinned to a legacy snapshot. 🟡 Medium
`extraction.ts:82` pins `claude-3-5-sonnet-20241022`, and `estimateExtractionCost()`
hardcodes that model's 2024 pricing (`$3`/`$15` per 1M). Both are stale. The current
default for this workload is `claude-opus-5`; if per-extraction cost is the binding
constraint, `claude-haiku-4-5` is the deliberate downgrade. Either way the model id and
its pricing belong in one config module, not inline literals in two functions.

### A5 — No prompt caching, so every story pays full price for the same 2K tokens. 🟡 Medium
`createExtractionPrompt()` emits ~1,500–2,000 tokens of static instructions (relation
types, conflict rules, worked examples, response schema) that are byte-identical on
every call, and are re-sent as fresh input tokens each time.

> **Fix:** move the static block into `system` with
> `cache_control: { type: 'ephemeral' }`, and keep the volatile parts (existing-people
> list, story text) *after* the breakpoint, in `messages`. Confirm it's working by
> asserting `usage.cache_read_input_tokens > 0` on the second call — if it's zero, some
> volatile value has leaked into the prefix.

### A6 — Model output is regex-scraped, not validated. 🟡 Medium
`extraction.ts:103-109` matches a ```json fence with a regex, falls back to the raw
text, and `JSON.parse`s it. There is no schema check before those objects are written to
the database — a hallucinated `relationType` goes straight into a column whose enum is
only enforced at the TypeScript level, not by SQLite. Meanwhile
`extractionResultSchema` in `lib/validation/schemas.ts:131` is a complete Zod schema for
exactly this payload, and is never imported.

> **Fix:** use structured outputs (`output_config.format`) or a `strict: true` tool so
> the shape is guaranteed at the API boundary, then still parse through the existing Zod
> schema before any write. Reject unknown relation types rather than storing them.

### A7 — `response.content[0]` is assumed to be text
`extraction.ts:94` reads block 0 and throws if it isn't text. Any model that returns a
thinking block first — the current default on the Opus/Sonnet 5 family — puts a
non-text block at index 0 and turns a successful call into a hard failure. Iterate the
array and pick the block where `block.type === 'text'`.

### A8 — Prompt injection surface. 🟠 High
`prompts.ts` interpolates the user's story directly into the instruction string, inside
double quotes: `STORY TO ANALYZE:\n"${storyText}"`. A story containing a quote plus
new instructions can restructure the task, fabricate people and relations, or exfiltrate
the existing-people list that is included above it in the same prompt.

Today the author and the victim are the same person, so the blast radius is small. It
stops being small the moment stories can be imported, shared, or pulled from a
messaging integration — all of which are on the roadmap.

> **Fix:** instructions in `system`; the story in its own user content block wrapped in
> explicit delimiters (`<story>…</story>`) with an instruction that its contents are
> data, never directions; and schema validation on the way out (A6) as the backstop.

### A9 — No timeout, retry, or cancellation
The SDK's 10-minute default timeout applies, there is no `AbortController`, and no way
to cancel from the UI. `setIsProcessing(true)` in `app/(tabs)/two.tsx:72` is only
cleared in `finally`, so a hung request pins the button in a loading state for minutes.
React Query's global `retry: 1` (`app/_layout.tsx:19`) applies to queries, not this
mutation — so there is no retry either.

### A10 — Cost is invented in the UI
`app/(tabs)/two.tsx:141` displays a hardcoded `'$0.02'` for any non-empty story,
regardless of length. `estimateExtractionCost()` exists, is accurate-ish, and is never
called. `tokensUsed` is stored per story but never aggregated, so a user cannot see what
they have actually spent.

### A11 — Offline stories are never re-processed
For a product whose pitch is local-first, extraction is strictly online. A story written
without connectivity is saved with `aiProcessed = false` and there is no queue, no
retry, and no UI to find it again. `aiProcessed` is a ready-made work queue that nothing
drains.

### A12 — The conflict engine is dead code. 🟠 High
`lib/ai/conflict-detection.ts` (521 lines), `conflict-resolution.ts` (309), and
`food-knowledge.ts` (497) implement deterministic, testable, offline conflict detection
— "allergic to potatoes" vs "likes fries", vegan vs cheese. **Nothing in the app imports
them.** The only consumer is their own unit test. Conflict detection is instead
delegated entirely to the prompt, and the `conflicts` array the model returns is counted
in an `Alert` (`two.tsx:94`), stored inside the story's `extractedData` JSON blob, and
otherwise discarded — never persisted as rows, never shown, never resolvable.

This is the most valuable code in the repository and it is switched off.

> **Fix:** call `detectConflicts()` in the write path of both `useExtraction` and
> `useCreateRelation`, persist detected conflicts as rows, and add a resolution UI
> (`suggestResolution()` already computes the recommended action).
> Note the scaling trap: `findAllConflicts()` is O(n²) over all relations — at 100
> people × 50 relations that is 12.5M comparisons on the JS thread. Scope it to the
> subject's own relations, which is what the per-write path needs anyway.

### A13 — Auto-accept writes sensitive inferences with no provenance UI
`shouldAutoAccept()` silently commits `FEARS`, `STRUGGLES_WITH`, `SENSITIVE_TO`, and
`UNCOMFORTABLE_WITH` relations at ≥0.90 self-reported confidence, and `CARES_FOR` /
`DEPENDS_ON` at ≥0.95. A model's self-reported confidence is not calibrated, these are
the most sensitive categories in the ontology, and the resulting rows carry no visible
"AI said this" marker and no undo. The pending-review queue exists — sensitive types
should route through it unconditionally, regardless of confidence.

### A14 — Pending extractions from newly-created people always display "Unknown"
`useExtraction.ts:139-142` looks up the display name via
`personIdMap.get(rel.subjectId)`, but `rel.subjectId` is already the *resolved* id. For
an existing person the map key happens to equal its value so it works by accident; for a
newly created person the key is the model's temp id and the value is the new UUID, so
the lookup misses and the reverse `find` falls through to `'Unknown'`. Every review card
for a newly discovered person shows "Unknown likes ice cream".

### P1 — Privacy posture doesn't match the product's promise. 🟠 High
The README's headline is "Your data stays on your device. No cloud storage." The app
sends the full text of stories — which the in-app example prompts explicitly encourage
to include health and relationship details ("Mike mentioned his mother has dementia",
"Sarah and Tom broke up, she's uncomfortable talking about it") — to a third-party API.
There is no consent screen, no redaction, no retention statement, and no deletion path.

This is data about *third parties who never consented*, in special categories (health,
beliefs, sexual/relationship status). Before any public release this needs: an explicit
first-run disclosure of what leaves the device and when, a privacy policy, a working
data-deletion path, and Apple's Privacy Nutrition Label filled in honestly. An app that
records sensitive data about non-users is a foreseeable App Review flag.

---

## 4. UI / UX

### U1 — The home screen is a stub. 🔴 Blocker
`app/(tabs)/index.tsx:13-19` runs a 500 ms `setTimeout` and calls `setPeople([])`. It
does not import `usePeople`. The `error` state and `refetch` function are dead code that
can never fire. Adding a person succeeds, shows a success alert, and then the person is
nowhere — because the list that would show them is hardcoded empty.

### U2 — A destructive dev screen ships to production. 🟠 High
`app/dev.tsx` exposes "Clear All Data" (a hard delete of everything) with no `__DEV__`
guard. `app.json` registers the scheme `friendsmobile`, so it is reachable in a release
build via `friendsmobile://dev` as well as by any in-app navigation.

> **Fix:** wrap the route's default export in `if (!__DEV__) return <NotFound/>`, or
> better, exclude the file from production bundles entirely.

### U3 — The review queue is reachable only from a dismissible alert
The only navigation to `/review-extractions` is a button inside the post-extraction
`Alert` (`two.tsx:101`). Dismiss it and every pending item is unreachable — there is no
tab, no badge, no entry point. `usePendingExtractionsCount()` exists precisely for a
badge and is never called. Medium-confidence extractions accumulate invisibly.

### U4 — Two segmented controls bound to one state
`app/modal.tsx:84-102` renders two stacked `SegmentedButtons` groups both driving
`relationshipType`. Whichever group doesn't hold the current value renders with nothing
selected while remaining interactive, so the control contradicts itself. Use one control
— a chip row or a menu — for the five relationship types.

### U5 — `Alert.alert` is the primary result surface
Extraction results, save confirmations, and errors are all native alerts, including
three-button alerts (`two.tsx:98-109`) built by `unshift`/`push` so button order shifts
depending on results. Alerts are modal, non-dismissible by gesture, unstyleable, and do
not render on `react-native-web` — which `app.json` configures as a target.

> **Fix:** Paper's `Snackbar` for confirmations, and a real results screen for
> extraction output (which also gives the conflicts somewhere to live).

### U6 — Zero accessibility. 🟡 Medium
A grep for `accessibilityLabel` / `accessibilityRole` / `accessible=` across `app/` and
`components/` returns nothing. The icon-only edit and delete `IconButton`s in the person
header (`app/person/[id].tsx:97-103`) are completely unlabeled for screen readers, and
the avatar initials carry no alternative text.

### U7 — Dark mode is half-wired, and the theme is bypassed
`_layout.tsx` swaps the *navigation* theme on `colorScheme`, but `PaperProvider` gets no
theme, and every screen hardcodes light colors (`#f5f5f5` backgrounds, `#6200ee`
accents, `#d32f2f` errors) in its own `StyleSheet`. In dark mode you get a dark chrome
around permanently-light screens. `constants/Colors.ts` exists and is used only by the
tab bar.

> **Fix:** one `MD3` theme object passed to both `PaperProvider` and `ThemeProvider`,
> and `useTheme()` in screens instead of literals.

### U8 — Forms don't handle the keyboard
No `KeyboardAvoidingView` or `SafeAreaView` anywhere in `app/`. The 12-line story input
(`two.tsx:176`) and the add-person form sit under the iOS keyboard while being typed in.

### U9 — The list won't hold at the documented scale
`PRODUCTION_CONSIDERATIONS.md` targets 100+ people. The list has no `React.memo` on
rows, no `getItemLayout`, no pagination, no pull-to-refresh, and no `ListEmptyComponent`
(the empty state is a sibling of the `FlatList`, so both are laid out at once).

### U10 — Search is name-only and in-memory
`index.tsx:21` filters the loaded array on `name` with no debounce. The README's headline
capability — "find people by preferences, experiences, or connections" — is not
implemented at all. Doing it in JS over every loaded row won't scale either.

> **Fix:** push search into SQL, and adopt SQLite **FTS5** over `relations.objectLabel`
> + `stories.content` when preference search lands. That decision is easier to make now
> than after there's data to migrate.

### U11 — A failed DB init drops the user into a broken app
`_layout.tsx:56-59` catches migration failure, logs it, and hides the splash screen
anyway. The user lands on a UI where every action fails opaquely. Render a blocking
error state with a retry instead.

### U13 — Manual entry exposes half the ontology
`add-relation.tsx:9-20` offers 10 relation types; the schema defines 20. Notably
`SENSITIVE_TO` — the anchor of the entire allergy/conflict feature — cannot be entered
by hand, only inferred by the model. Users can't record their friend's allergy directly.

---

## 5. Build, CI, testing & tooling

### C1 — Every gate is red (see §1). 🔴 Blocker
The workflow runs typecheck, lint, tests, and format — and all four fail on `main`. This
is the meta-finding: the pipeline exists, is well-structured, and is being ignored.

### C2 — `tsconfig.json` extends a path that doesn't exist
`"extends": "expo/tsconfig"` → the package ships `expo/tsconfig.base`. One-character
class of typo; it breaks `tsc` and every `ts-jest` run.

### C3 — `randomUUID` used without import. 🔴 Blocker
`hooks/useStories.ts:51` and 12 sites in `lib/db/seed.ts`. Saving any story and running
the dev seeder both throw `ReferenceError` at runtime.

### C4 — ESLint ignores 65% of the source
`eslint.config.js:15-19` ignores `app/**`, `components/**`, `hooks/**`, `store/**`, and
`__tests__/**`, with the comment *"UI code, less critical for CI"*. That exclusion is
exactly why C3 was never caught — `hooks/` is unlinted. Test code being unlinted is its
own hazard.

> **Fix:** lint everything. Add `no-undef`/`import/no-unresolved` and
> `@typescript-eslint/no-explicit-any` as warnings — `as any` appears 20+ times in the
> hooks, mostly to paper over Drizzle's `.returning()` types.

### C5 — Hooks and components are structurally untestable
`jest.config.js:20` sets `modulePathIgnorePatterns: ['app/', 'components/', 'hooks/']`,
the preset is `ts-jest` with `testEnvironment: 'node'`, and `jest-expo` +
`@testing-library/react-native` are installed but unused. So no component or hook test
*can* run, by configuration.

> **Fix:** switch the preset to `jest-expo`, drop the ignore patterns, and keep
> `collectCoverageFrom` honest.

### C6 — One test file, covering the one module the app never calls
`lib/ai/__tests__/conflict-detection.test.ts` is the entire suite, and it currently
executes zero tests because of C2. Real coverage of shipped code paths: 0%.

> **Suggested first tests (highest value per line):** migrations actually create every
> table; `getCurrentUserId` is stable across calls; extraction output failing Zod is
> rejected rather than written; approve-pending is idempotent; `shouldAutoAccept`
> thresholds; the `detectConflicts` matrix (already written — just make it run).

### C7 — "Build Check" doesn't build
The `build` job runs `expo-doctor || true` and then re-runs `typecheck`. Nothing ever
bundles the app, which is why a missing import in a screen would still reach a release.

> **Fix:** add `npx expo export --platform all` to CI. It catches exactly this class of
> bug, and it's ~2 minutes.

### C8 — The security job cannot fail
`npm audit ... || true` on one step and `continue-on-error: true` on the next. There is
no secret scanning, no dependency review, and `--production` skips dev-tool CVEs.

### C10 — No dependency policy
Caret ranges on `@anthropic-ai/sdk`, `drizzle-orm`, `zustand`, `zod`. A `drizzle-orm`
`0.44 → 0.45` bump can change the schema builder API under you with no lockfile refresh
in CI. No Renovate/Dependabot config.

### C11 — Unused dependencies in the bundle
`expo-file-system`, `expo-document-picker`, `expo-image-picker`, `expo-image-manipulator`,
`expo-image`, `react-hook-form` — all installed, none imported. `expo-secure-store` is
installed and *should* be used (A2). `@types/react-native` is deprecated — React Native
ships its own types since 0.71 and the stale package can shadow them.

### C12 — No release engineering
No `eas.json`, no `runtimeVersion`, no OTA update policy, no crash reporting, no
analytics. `console.error` is the only telemetry, which means field failures are
invisible. This matters sooner than it looks: adding SQLCipher or changing the schema
requires a native rebuild, and there's currently no rollout path to reason about.

### C13 — No pre-commit hooks
`TASKS.md` plans Husky + lint-staged; nothing is installed. Every guardrail currently
depends on a CI run that is already failing.

---

## 6. Documentation drift

### X1 — The root README describes a different application. 🟡 Medium
It documents Electron/Tauri, RDF/Turtle via N3.js, data at `~/Documents/Friends/main.ttl`,
`npm install` + `npm run dev` at the repo root, and a `server/` proxy with
`npm run proxy`. The actual product is an Expo/React Native app storing SQLite via
Drizzle and calling Anthropic directly from the device. There is no root `package.json`,
so the documented first command fails immediately. A new contributor cannot get started.

### X2 — Three mutually exclusive architectures are documented as current
`TASKS.md` specifies PostgreSQL + Prisma + Express in a monorepo. `LOCAL_FIRST_ARCHITECTURE.md`
specifies RDF/Turtle. `SQLITE_DRIZZLE_GUIDE.md` and `MOBILE_DATA_LAYER.md` describe what
was actually built. Nothing records which decision won or why.

> **Fix:** a short `docs/adr/` with the three decisions that were actually made
> (SQLite over RDF, mobile-first over desktop, BYO-key over proxy), a `docs/README.md`
> index, and a `> **Superseded**` banner at the top of the docs that lost.

### X3 — The README's feature list is aspirational
Smart search, insights dashboard, visual timelines, and preference clouds are listed
under "Phase 1: MVP (Current)". None exist. Move them to Planned.

---

## 7. What will hurt later (not yet broken)

| Risk | Why it bites later | Decide now |
|---|---|---|
| **Sync identity** | Local user id is a per-device random UUID; the same human on two phones is two users, and no `updated_at` discipline exists for LWW ordering | Device id vs. account id, and a real clock strategy, *before* any data exists to reconcile |
| **Migration safety** | Hand-written `CREATE TABLE IF NOT EXISTS` cannot evolve once real users hold data | Adopt drizzle migrations pre-launch; back up the DB file before each migration; guard on `user_version` |
| **Relation growth** | Relations only ever accumulate; no decay, archival, or "still true?" review; `findAllConflicts` is O(n²) | Scope conflict checks per subject; plan a periodic "is this still true?" flow (`relations.status` already models it) |
| **Cost & abuse** | The monetization plan implies a hosted proxy; BYO-key defers rather than solves it | Proxy design: per-user quota, key rotation, zero story retention, documented region |
| **Store review** | Sensitive third-party data + no privacy policy + no deletion path | Privacy policy, in-app deletion, honest Nutrition Label before first submission |
| **Web target** | `app.json` targets web, but `Alert.alert` and `expo-sqlite` behave differently there | Either commit to web (OPFS/wa-sqlite, Snackbars) or drop the target |

---

## 8. Recommended order of work

### P0 — Make the app actually work (est. 1–2 days)
1. Fix `tsconfig.json` → `expo/tsconfig.base`; get all four CI gates green. *(C1, C2)*
2. Import `randomUUID` in `hooks/useStories.ts` and `lib/db/seed.ts`. *(C3)*
3. Wire real drizzle migrations; delete the hand-written DDL; block the app on
   migration failure with a visible error. *(D1, U11)*
4. Rewrite `app/(tabs)/index.tsx` on top of `usePeople()`. *(U1)*
5. Enable `PRAGMA foreign_keys = ON` and `journal_mode = WAL`. *(D3, D12)*
6. Guard `/dev` behind `__DEV__`. *(U2)*
7. Add `.env` to both `.gitignore` files; enable push protection. *(A3)*
8. Move the API key to `expo-secure-store`. *(A2)*

**Definition of done:** on a clean device — write a story → see extracted people in the
list → open a profile → see relations → review a pending extraction. Today none of those
five steps works.

### P1 — Make it trustworthy (est. 1 week)
9. Lint and test everything: drop the ESLint and Jest ignore lists, switch to
   `jest-expo`, add `expo export` to CI, make the security job able to fail. *(C4, C5, C7, C8)*
10. Validate every AI response through the existing Zod schema; adopt structured
    outputs; fix the `content[0]` assumption. *(A6, A7)*
11. Restructure the prompt: static instructions in a cached `system` block, story in a
    delimited user block. Gets injection hardening and ~90% prefix cost reduction in one
    change. *(A5, A8)*
12. Wrap extraction and approve-pending in transactions; make extraction idempotent
    per `storyId`. *(D4)*
13. Resolve the local user once at startup; make the failure path throw. *(D5, D6)*
14. Wire `detectConflicts()` into the write path; persist conflicts; build the
    resolution UI. *(A12)*
15. Route all sensitive relation types through review regardless of confidence, and mark
    AI-sourced rows visibly with an undo. *(A13)*
16. Fix the "Unknown" subject name in pending extractions. *(A14)*
17. Add a pending-review tab with a count badge. *(U3)*
18. Ship data export/import. *(D13)*

### P2 — Make it good (est. 2–3 weeks)
19. Real theming and working dark mode; replace alerts with Snackbars and a results
    screen; keyboard handling; accessibility labels throughout. *(U4–U8)*
20. Push search into SQL; adopt FTS5 for preference/story search. *(U10)*
21. Person merge flow using the dedupe scoring that already exists. *(D15)*
22. Move model id + pricing into config; show real cost estimates; aggregate spend. *(A4, A10)*
23. Retry queue draining `aiProcessed = false`; timeouts and cancellation. *(A9, A11)*
24. Story ↔ people join table; composite indexes matching the real query shapes. *(D8, D9)*
25. Drop `sessions` / `magic_link_tokens`; implement or remove `secrets`. *(D10, D11)*
26. Docs: rewrite the root README to describe what exists; add ADRs; mark superseded
    documents. *(X1–X3)*
27. Privacy: first-run disclosure, privacy policy, in-app deletion. *(P1)*
28. Release engineering: `eas.json`, crash reporting, Renovate, Husky. *(C10, C12, C13)*

---

## 9. Notable strengths

Worth stating plainly, because the finding list above is one-sided:

- **The schema is genuinely good.** Soft deletes, sync columns, temporal validity
  (`validFrom`/`validTo`), provenance (`source`, `confidence`, `addedBy`), and
  relationship lifecycle (`archiveReason`, `endReason`) are modeled thoughtfully and
  early. Most apps retrofit all of this painfully.
- **The 20-type relation ontology** is a real design contribution — richer and more
  honest than the tag soup this category usually ships.
- **The conflict-detection engine** is the most interesting code here: deterministic,
  offline, testable, and it encodes real domain knowledge (ingredient derivation,
  dietary implication). It only needs to be *called*.
- **The CI workflow's structure** is right — four independent jobs, matrix-ready,
  artifact upload. It needs to be enforced, not designed.
- **The pending-extractions review model** — auto-accept by confidence, queue the rest
  for human review — is the correct architecture for AI-extracted personal data.
