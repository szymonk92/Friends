# Google Vertex AI Testing Plan

## 1. Objective
To evaluate the extraction accuracy, hallucination rate, and JSON schema compliance of **Gemini 1.5 Pro (002)** and **Gemini 1.5 Flash (002)** using different system prompt strategies.

## 2. Test Setup
*   **Platform:** Google Vertex AI Studio (Freeform Prompt)
*   **Models:**
    *   `gemini-1.5-pro-002` (High reasoning, higher cost)
    *   `gemini-1.5-flash-002` (Fast, lower cost)
*   **Parameters:**
    *   Temperature: `0` (Deterministic)
    *   Max Output Tokens: `8192`
    *   Top P: `0.95`
    *   Top K: `40`

## 3. System Prompts (The Variables)

### Prompt A: Baseline (Current)
*The current prompt used in the application.*

```text
You are an AI assistant that extracts structured relationship data from stories about people.

YOUR TASK:
Extract all people mentioned and their relations (preferences, facts, experiences, etc.)

RELATION TYPES (use exactly these):
- KNOWS: knows a person/place/thing
- LIKES: enjoys, prefers, loves
- DISLIKES: dislikes, hates, avoids
- ASSOCIATED_WITH: connected to a place, group, organization
- EXPERIENCED: went through an event or experience
- HAS_SKILL: has ability or skill
- OWNS: possesses something
- HAS_IMPORTANT_DATE: birthday, anniversary, etc.
- IS: identity, role, profession, trait (e.g., "vegan", "vegetarian", "lactose intolerant")
- BELIEVES: holds belief, opinion, value
- FEARS: afraid of, anxious about
- WANTS_TO_ACHIEVE: goal, aspiration, dream
- STRUGGLES_WITH: difficulty, challenge, problem
- CARES_FOR: looks after, supports (person or cause)
- DEPENDS_ON: relies on (person, thing, or activity)
- REGULARLY_DOES: habit, routine, regular activity
- PREFERS_OVER: prefers X over Y

OUTPUT FORMAT:
Respond with valid JSON only.
{
  "people": [
    { "id": "uuid or null", "name": "string", "isNew": boolean, "personType": "primary" | "mentioned" | "placeholder", "confidence": number }
  ],
  "relations": [
    { "subjectName": "string", "relationType": "string", "objectLabel": "string", "confidence": number }
  ],
  "ambiguousMatches": []
}
```

### Prompt B: Chain of Thought (CoT)
*Encourages the model to "think" before outputting JSON to reduce hallucinations.*

```text
You are an expert data extraction AI. Your goal is to build a knowledge graph from user stories.

INSTRUCTIONS:
1. First, read the story and identify every entity (Person, Place, Concept).
2. For each person, determine if they exist in the provided database or are new.
3. If a name is common (e.g., "Sarah") and multiple exist, mark as AMBIGUOUS unless context is clear.
4. Extract every fact as a relationship using the allowed types.
5. THINK step-by-step before generating the final JSON.

[Insert Relation Types from Prompt A]

OUTPUT FORMAT:
{
  "thought_process": "Brief explanation of your reasoning...",
  "people": [...],
  "relations": [...]
}
```

### Prompt C: Strict Schema & Categorization
*Focuses on strict categorization of "mentioned" vs "primary" people.*

```text
You are a strict database administrator AI.

RULES FOR PEOPLE:
1. "primary": ONLY use for people explicitly tagged with @Name or who are clearly close friends/family (e.g., "my wife", "my brother").
2. "mentioned": People who are present in the story but not central characters.
3. "placeholder": People mentioned only by reference (e.g., "the waiter", "his boss").

AMBIGUITY RULES:
- Never guess. If "John" is mentioned and you have "John Doe" and "John Smith", return "ambiguousMatches".

[Insert Relation Types from Prompt A]

OUTPUT FORMAT:
JSON ONLY. No markdown formatting.
```

## 4. Context Data (Paste this into the "Context" or "User" block before the story)

```text
CURRENT DATABASE STATE:

EXISTING PEOPLE:
- Sarah Jones (ID: user_1)
- Mike Ross (ID: user_2)
- Jessica Pearson (ID: user_3)
- Louis Litt (ID: user_4)
- Harvey Specter (ID: user_5)
- Rachel Zane (ID: user_6)
- Donna Paulsen (ID: user_7)

EXISTING RELATIONS:
- Harvey Specter: KNOWS "Mike Ross"
- Mike Ross: IS "Lawyer"
- Louis Litt: LIKES "Mudding"
- Jessica Pearson: OWNS "Pearson Hardman"
```

## 5. Test Stories (The Data)

| ID | Type | Story Text | Expected Outcome |
| :--- | :--- | :--- | :--- |
| 1 | **Empty** | " " | Empty JSON arrays. |
| 2 | **Simple Fact** | "I love pizza." | Self: LIKES "pizza". |
| 3 | **Existing Person** | "I had lunch with Sarah Jones today." | Link to `user_1`. Relation: EXPERIENCED "lunch". |
| 4 | **Ambiguous** | "I saw Mike at the store." | Ambiguous match (Mike Ross vs unknown). |
| 5 | **New Person** | "Met a guy named Alex Williams who plays guitar." | New Person: Alex Williams. Relation: HAS_SKILL "guitar". |
| 6 | **Complex List** | "Invited Sarah, Mike, and Jessica to the party. Louis came too." | Link `user_1`, `user_2`, `user_3`, `user_4`. Relation: EXPERIENCED "party". |
| 7 | **Negative** | "I really hate waiting in line, but I love theme parks." | Self: DISLIKES "waiting in line", LIKES "theme parks". |
| 8 | **Implicit** | "My boss was being difficult today." | New Person: "My boss" (placeholder). Relation: IS "difficult". |
| 9 | **Update** | "Louis actually hates mudding now." | Louis: DISLIKES "mudding" (Conflict/Update). |
| 10 | **Long Story** | "Went to the beach with Rachel. She forgot her sunscreen so we had to buy some. Then we met her friend Tom who is a surfer. Tom told us he loves the ocean but is afraid of sharks." | Link `user_6`. New: "Tom". Tom: IS "surfer", LIKES "ocean", FEARS "sharks". |

## 6. Execution Strategy

1.  **Open Google Vertex AI Studio.**
2.  **Select "Freeform" mode.**
3.  **Paste System Prompt** (A, B, or C) into the "System Instructions" box.
4.  **Paste Context Data** into the main prompt area.
5.  **Paste a Test Story** below the context.
6.  **Run** with both **Gemini 1.5 Pro** and **Flash**.
7.  **Record Results:**
    *   Did it link to the correct ID?
    *   Did it create a new person when it shouldn't have?
    *   Did it hallucinate a relationship?
    *   Latency (Time to First Token).

## 7. What to Paste (Copy-Paste Ready)

**Step 1: System Instruction**
(Copy Prompt A, B, or C from Section 3)

**Step 2: User Prompt**
```text
CURRENT DATABASE STATE:

EXISTING PEOPLE:
- Sarah Jones (ID: user_1)
- Mike Ross (ID: user_2)
- Jessica Pearson (ID: user_3)
- Louis Litt (ID: user_4)
- Harvey Specter (ID: user_5)
- Rachel Zane (ID: user_6)
- Donna Paulsen (ID: user_7)

EXISTING RELATIONS:
- Harvey Specter: KNOWS "Mike Ross"
- Mike Ross: IS "Lawyer"
- Louis Litt: LIKES "Mudding"
- Jessica Pearson: OWNS "Pearson Hardman"

EXTRACT RELATIONS FROM THIS STORY:

"[INSERT STORY HERE]"

Please analyze this story and extract people, their relationships, and any conflicts with existing data. Respond with JSON only.
```
