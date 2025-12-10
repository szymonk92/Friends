# AI Analysis & Architecture

## 1. AI Request Handling Analysis

### Current Architecture
The application uses a **Session-Based** approach for AI interactions, implemented in `lib/ai/ai-service.ts` and `lib/ai/extraction.ts`.

**Flow:**
1.  **Session Creation:** `createAISession` initializes a session in memory.
    *   **System Prompt:** A system prompt is generated (`createSystemPrompt`) and added as the *first message* in the session history.
2.  **Context Update:** `updateSessionContext` injects current app state (existing people, relations) as a user message (`CONTEXT UPDATE: ...`).
3.  **Execution:** `callAISession` is invoked with the user's input (e.g., a story).
    *   **Payload:** The **entire message history** (System Prompt + Context + User Input) is sent to the AI provider (Anthropic/Gemini).
    *   **Trimming:** A basic token trimming mechanism (`trimSessionMessages`) exists to keep the context within limits, preserving the system prompt.

### Key Findings
*   **Do we send the system prompt every time?**
    *   **Yes.** The system prompt is the first message in the `session.messages` array, which is sent in full for every request. This is standard behavior for stateless REST APIs like Anthropic/OpenAI, as they don't "remember" previous requests unless you send the history.
*   **Do we store the session key?**
    *   **No.** Sessions are stored in an in-memory `Map<string, AISession>`. They are lost when the app is closed or reloaded. The `sessions` table in the database is for User Authentication, not AI conversations.
*   **What is sent?**
    *   `System Message`: Instructions on how to extract data.
    *   `User Message (Context)`: JSON dump of existing people/relations.
    *   `User Message`: The actual story text.

### Room for Improvement
1.  **Session Persistence:**
    *   **Problem:** Context is rebuilt from scratch every time `extractRelationsFromStorySession` is called (it creates a new session). This is inefficient if the user has a long-running "conversation" with the AI, though for single-shot extraction it's acceptable.
    *   **Fix:** Persist AI sessions to a new SQLite table (e.g., `ai_sessions`, `ai_messages`) if multi-turn conversation is needed.
2.  **Context Optimization:**
    *   **Problem:** Sending the full list of people/relations as JSON text consumes significant tokens.
    *   **Fix:** Use RAG (Retrieval Augmented Generation) or only send "relevant" people (e.g., those matching names found in the text via simple string matching first).
3.  **Prompt Caching:**
    *   **Opportunity:** Anthropic supports "Prompt Caching" for system prompts and large context blocks. This could significantly reduce costs and latency.

---

## 2. User Types: Primary vs. Mentioned vs. Placeholder

### Current Schema
The `people` table in `lib/db/schema.ts` already supports this classification:
```typescript
personType: text('person_type', {
  enum: ['primary', 'mentioned', 'placeholder', 'self'],
}).default('placeholder')
```

*   **Primary:** People explicitly added by the user (The "Core Network").
*   **Mentioned:** People extracted from stories but not yet fully profiled.
*   **Placeholder:** Temporary entities or ambiguous references.

### Implementation Strategy

#### 1. Setting the Type
*   **Manual Creation:** When a user manually adds a person, set `personType = 'primary'`.
*   **AI Extraction:**
    *   The AI already returns `personType` in `ExtractedPerson`.
    *   When saving extracted people, ensure this field is written to the DB.
    *   **Logic:** If confidence is high (>0.9), maybe default to `mentioned`. If low, `placeholder`.

#### 2. Filtering in Index Page (`app/(tabs)/index.tsx`)
Currently, the list shows *everyone*. To improve this:

**A. Update `usePeople` Hook (Optional but recommended for performance):**
You might want separate hooks or filter arguments:
```typescript
// hooks/usePeople.ts
export function usePeople(filter?: { type?: 'primary' | 'mentioned' | 'all' }) {
  // ... drizzle query with where clause
}
```

**B. Update UI Filtering:**
Modify the `filteredPeople` logic in `index.tsx`:

```typescript
const [viewMode, setViewMode] = useState<'network' | 'all'>('network');

const filteredPeople = useMemo(() => {
  return people.filter((person) => {
    // ... existing search/tag logic ...

    // NEW: Type Filtering
    if (viewMode === 'network') {
      // Show only Primary and Self
      return person.personType === 'primary' || person.personType === 'self';
    }
    // 'all' shows everyone including mentioned/placeholders
    return true;
  });
}, [people, searchQuery, selectedTags, viewMode]);
```

### Recommended Architecture for "People" Management

1.  **The "Inbox" Pattern:**
    *   Treat `mentioned` and `placeholder` people as "Inbox" items.
    *   Show a notification: "3 new people found in stories".
    *   Allow the user to "Confirm" (promote to `primary`) or "Merge" them.

2.  **Visual Distinction:**
    *   **Primary:** Full opacity, bold text.
    *   **Mentioned:** Slight transparency, maybe a dotted border or specific icon.
    *   **Placeholder:** Greyed out.

## 3. Summary of Recommendations

| Feature | Current Status | Recommendation |
| :--- | :--- | :--- |
| **AI Session** | In-Memory, Recreated per request | Keep as-is for single extraction. Persist if adding Chat. |
| **System Prompt** | Sent every request | Enable **Prompt Caching** (Anthropic) to save costs. |
| **Person Types** | Exists in DB, unused in UI | Implement **View Toggles** (My Network vs. All). |
| **Data Flow** | AI -> Extraction -> DB | Add a **Review Step** before promoting 'mentioned' to 'primary'. |
