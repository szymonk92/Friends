# Visualization Guide & Detailed Examples

**Updated:** November 7, 2025
**Architecture:** Hierarchical Ontology (Approach 3)
**Phase 1 Relations:** 8 Core Types

---

## 🎯 Confirmed Architecture Decision

### Phase 1: 8 Core Relations

1. **KNOWS** - Social relationships (with qualifiers like "married", "siblings")
2. **LIKES** - Positive preferences
3. **DISLIKES** - Negative preferences & dietary restrictions
4. **ASSOCIATED_WITH** - Location connections
5. **EXPERIENCED** - Shared activities
6. **HAS_SKILL** - Competencies ⭐ **Added to Phase 1**
7. **OWNS** - Possessions ⭐ **Added to Phase 1**
8. **HAS_IMPORTANT_DATE** - Birthdays, anniversaries ⭐ **Added to Phase 1**

### Key Feature: Comments/Qualifiers on Relations

```typescript
Ola → KNOWS → Simon
  qualifier: "married"
  since: 2018-06-15
  comment: "Met at university, married 5 years ago"
```

---

## 🎨 Visualization Approaches

### 1. Person Detail View (Primary View)

```
╔═══════════════════════════════════════════════════════════════╗
║  Ola                                                [Edit] ⚙️  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  📸 [Profile Photo]          Relationship: Friend              ║
║                              Met: Nov 7, 2015 (10 years ago)   ║
║                              Strength: ████████░░ 0.85         ║
║                                                                 ║
╠═══════════════════════════════════════════════════════════════╣
║  📊 TABS:  [Overview] [Connections] [Preferences] [Timeline]  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  OVERVIEW                                                      ║
║  ─────────────────────────────────────────────────────────────║
║                                                                 ║
║  🎂 Important Dates                                           ║
║  • Birthday: May 15                                           ║
║  • Anniversary (with Simon): June 15, 2018                    ║
║                                                                 ║
║  👥 Connections (3)                                           ║
║  • Simon (married) 💍 since 2018                             ║
║  • Mark (friend, colleague)                                   ║
║  • Lisa (friend) - met through Ola                           ║
║                                                                 ║
║  ❤️  Likes (8)                                                ║
║  🍦 ice cream (⭐⭐⭐⭐⭐ very strong)                       ║
║  🍕 Italian food (⭐⭐⭐⭐ strong)                           ║
║  🇮🇹 Italy (⭐⭐⭐⭐⭐ very strong) - visited 10x           ║
║  🎾 tennis (⭐⭐⭐ moderate)                                 ║
║  📚 reading (⭐⭐⭐ moderate)                                ║
║  🎸 live music (⭐⭐⭐⭐ strong)                            ║
║  ⛰️  hiking (⭐⭐ mild)                                      ║
║  ☕ espresso (⭐⭐⭐⭐ strong)                               ║
║                                                                 ║
║  🚫 Dislikes / Restrictions (2)                               ║
║  🥜 nuts (ALLERGY - severe) ⚠️                               ║
║  🍖 spicy food (preference - mild)                            ║
║                                                                 ║
║  🛠️ Skills (4)                                                ║
║  👨‍💻 Python (expert)                                          ║
║  🍳 Italian cooking (advanced)                                ║
║  🎸 Guitar (intermediate)                                     ║
║  📸 Photography (advanced)                                    ║
║                                                                 ║
║  🏠 Owns (3)                                                  ║
║  🚗 Tesla Model 3 (since 2022)                               ║
║  📷 Sony A7 III camera                                        ║
║  🎸 Fender Stratocaster guitar                               ║
║                                                                 ║
║  📍 Places (5)                                                ║
║  🏠 Lives: San Francisco, CA                                  ║
║  🏢 Works: Tech Corp HQ, downtown                            ║
║  ✈️ Visited: Italy (10x), France (3x), Japan (2x)           ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### 2. Network Graph View (Interactive)

```
                    You (User)
                       │
         ┌─────────────┼─────────────┐
         │             │             │
      [Ola]────💍───[Simon]      [Mark]────[Sarah]
    (friend)   married          (colleague) (colleague)
    since 2015
         │
         │ met through
         │
      [Lisa]
    (friend)

Legend:
━━━  Strong connection (0.8-1.0)
──── Medium connection (0.5-0.79)
┄┄┄  Weak connection (0.0-0.49)
💍   Special qualifier (married, siblings, etc.)

Hover on connection:
┌─────────────────────────────┐
│ Ola ↔ Simon                │
│ Relationship: married 💍   │
│ Since: June 15, 2018       │
│ Shared experiences: 127    │
│ Strength: 0.95             │
│ Comment: "Met at uni"      │
└─────────────────────────────┘
```

**Visual Attributes:**
- **Node size** = Relationship strength
- **Edge thickness** = Number of shared experiences
- **Node color** = Relationship type (friend, family, colleague)
- **Edge style** = Solid (active), Dashed (past), Dotted (weak)
- **Icons** = Special qualifiers (💍 married, 👨‍👩‍👧 family, 🏢 work)

---

### 3. Preferences Matrix View

```
╔════════════════════════════════════════════════════════════════╗
║  WHO LIKES WHAT?                                [Filter] 🔍    ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║         │ Ice  │Italian│Hiking│Tennis│Spicy│Nuts│              ║
║         │Cream │ Food  │      │      │Food │    │              ║
║  ───────┼──────┼───────┼──────┼──────┼─────┼────┤              ║
║  Ola    │  ❤️   │  ❤️    │  ❤️   │  ❤️   │  ❌  │ ⚠️  │         ║
║  Simon  │  ❤️   │  ❤️    │  ❌   │  😐   │  ❤️  │  😐  │         ║
║  Mark   │  😐   │  😐    │  ❤️   │  ❌   │  😐  │  😐  │         ║
║  Sarah  │  ❤️   │  ❌    │  ❤️   │  ❤️   │  ❌  │ ⚠️  │         ║
║  Lisa   │  😐   │  ❤️    │  😐   │  ❤️   │  ❤️  │  😐  │         ║
║                                                                 ║
║  Legend:                                                       ║
║  ❤️  Strongly likes                                           ║
║  😐  Neutral / Unknown                                        ║
║  ❌  Dislikes                                                  ║
║  ⚠️  ALLERGY (severe)                                         ║
║                                                                 ║
║  💡 Insights:                                                  ║
║  • Ola & Sarah both allergic to nuts ⚠️                       ║
║  • 4/5 people like ice cream - great dessert choice!         ║
║  • Sarah is vegetarian (avoid Italian meat dishes)           ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
```

**Use Case:** Planning dinner party!

---

### 4. Timeline View (Chronological)

```
╔════════════════════════════════════════════════════════════════╗
║  TIMELINE: Ola                                                 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  2015 ●───────────────────────────────────────────────────────║
║       │                                                         ║
║       ● Nov 7, 2015: Met Ola at tech conference               ║
║         Story: "We immediately bonded over travel..."          ║
║                                                                 ║
║  2016 ●───────────────────────────────────────────────────────║
║       │                                                         ║
║       ● July 2016: First Italy trip together                  ║
║       ● Dec 2016: Ola introduced me to Simon                  ║
║                                                                 ║
║  2018 ●───────────────────────────────────────────────────────║
║       │                                                         ║
║       ● June 15, 2018: Ola & Simon's wedding 💍              ║
║         Attended as groomsman                                  ║
║                                                                 ║
║  2020 ●───────────────────────────────────────────────────────║
║       │                                                         ║
║       ● Mar 2020: Italy trip #5 (just before pandemic)        ║
║         "Best gelato in Rome!"                                 ║
║                                                                 ║
║  2024 ●───────────────────────────────────────────────────────║
║       │                                                         ║
║       ● Oct 2024: Italy trip #10! Anniversary celebration     ║
║         Visited Florence, ate lots of ice cream 🍦            ║
║       ● Nov 2024: Hiking with Ola, Mark, Sarah                ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
```

---

### 5. Skills & Resources View

```
╔════════════════════════════════════════════════════════════════╗
║  WHO CAN HELP?                                    [Search] 🔍 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Search: "Who knows Python?"                                   ║
║                                                                 ║
║  Results:                                                      ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ Ola                                        [Expert] ⭐⭐⭐⭐│ ║
║  │ Has been coding Python for 10+ years                     │ ║
║  │ Works at Tech Corp as Senior Dev                         │ ║
║  │ 📧 Contact: ola@email.com                               │ ║
║  └──────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ Lisa                                [Intermediate] ⭐⭐   │ ║
║  │ Learning Python for data science                         │ ║
║  │ Works at Data Corp                                       │ ║
║  └──────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║                                                                 ║
║  Other common searches:                                        ║
║  • "Who has a car?" → Mark (Tesla), Simon (Honda)            ║
║  • "Who can cook Italian?" → Ola (expert), Sarah (beginner)  ║
║  • "Who knows guitar?" → Ola (intermediate), Mark (expert)   ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
```

---

### 6. Meal Planning Assistant (Phase 1 Feature!)

```
╔════════════════════════════════════════════════════════════════╗
║  🍽️ MEAL PLANNER                                              ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Select Guests: [Ola ✓] [Simon ✓] [Sarah ✓] [Mark ✓]        ║
║                                                                 ║
║  ──────────────────────────────────────────────────────────── ║
║                                                                 ║
║  📊 DIETARY ANALYSIS                                           ║
║                                                                 ║
║  ⚠️ CRITICAL RESTRICTIONS:                                     ║
║  • Ola: ALLERGIC to nuts (severe)                            ║
║  • Sarah: ALLERGIC to nuts (severe)                          ║
║  • Sarah: Vegetarian (ethical)                               ║
║                                                                 ║
║  ❤️ POPULAR PREFERENCES:                                      ║
║  • 4/4 people: Love ice cream 🍦                             ║
║  • 3/4 people: Like Italian food 🍕                          ║
║  • 2/4 people: Like spicy food 🌶️                           ║
║                                                                 ║
║  ──────────────────────────────────────────────────────────── ║
║                                                                 ║
║  💡 MENU SUGGESTIONS                                           ║
║                                                                 ║
║  🥗 Appetizers:                                               ║
║  ✓ Caprese salad (safe for all)                             ║
║  ✓ Bruschetta (no nuts, vegetarian)                         ║
║                                                                 ║
║  🍝 Main Course:                                              ║
║  ✓ Vegetarian pasta primavera (Sarah's preference)          ║
║  ✓ Grilled chicken (for non-vegetarians)                    ║
║  ❌ Pesto pasta (contains pine nuts - DANGEROUS!)            ║
║                                                                 ║
║  🍰 Dessert:                                                  ║
║  ✓✓✓ Gelato / Ice cream (EVERYONE loves this!) 🎉          ║
║  ✓ Tiramisu (no nuts)                                        ║
║                                                                 ║
║  🥤 Drinks:                                                   ║
║  ✓ Italian wine (3/4 people like)                           ║
║  ✓ Espresso (Ola loves, others neutral)                     ║
║                                                                 ║
║  ──────────────────────────────────────────────────────────── ║
║                                                                 ║
║  📝 SHOPPING LIST                      [Export] [Print] 🖨️   ║
║  • Pasta (500g)                                               ║
║  • Fresh vegetables                                           ║
║  • Gelato (4 flavors - vanilla, chocolate, pistachio-free)  ║
║  • ...                                                        ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
```

---

### 7. Gift Ideas View

```
╔════════════════════════════════════════════════════════════════╗
║  🎁 GIFT IDEAS FOR: Ola                                       ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Based on preferences and interests:                           ║
║                                                                 ║
║  🎯 TOP RECOMMENDATIONS:                                       ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ 🇮🇹 Italy Travel Guide or Coffee Table Book              │ ║
║  │ Match: ⭐⭐⭐⭐⭐ (Loves Italy, visited 10x)             │ ║
║  │ Budget: $30-50                                            │ ║
║  └──────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ 📸 Photography Course or Camera Lens                     │ ║
║  │ Match: ⭐⭐⭐⭐ (Has Sony A7 III, skilled photographer)  │ ║
║  │ Budget: $100-500                                          │ ║
║  └──────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ 🎸 Guitar Accessories or Sheet Music                     │ ║
║  │ Match: ⭐⭐⭐ (Plays Fender Strat, intermediate level)   │ ║
║  │ Budget: $20-100                                           │ ║
║  └──────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║  🍦 SAFE BET:                                                 ║
║  • Artisan ice cream maker or gelato cookbook                 ║
║  • Italian espresso cups set                                   ║
║                                                                 ║
║  ⚠️ AVOID:                                                     ║
║  • Anything containing nuts (severe allergy!)                 ║
║  • Spicy food items (dislikes)                                ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 📝 Detailed Examples with 8 Relations

### Example 1: Complex Social Network

**Story Input:**
> "I met Ola 10 years ago at a tech conference in Warsaw. She introduced me to her husband Simon - they got married in 2018. Simon is a chef and makes incredible Italian food. Ola is a Python expert and has been teaching me for years. They both own Teslas and often drive to wine country. Ola's birthday is May 15th, and their anniversary is June 15th. They're both allergic to nuts. Ola also plays guitar and has a beautiful Fender Stratocaster."

**AI Extraction:**

```json
{
  "people": [
    { "name": "Ola" },
    { "name": "Simon" }
  ],
  "relations": [
    // KNOWS relations
    {
      "type": "KNOWS",
      "subject": "User",
      "object": "Ola",
      "metadata": {
        "since": "2015-11-07",
        "relationshipType": "friend",
        "context": "tech conference",
        "location": "Warsaw",
        "confidence": 1.0
      }
    },
    {
      "type": "KNOWS",
      "subject": "Ola",
      "object": "Simon",
      "metadata": {
        "relationshipType": "partner",
        "qualifier": "married",
        "since": "2018-06-15",
        "comment": "Husband and wife",
        "confidence": 1.0
      }
    },
    {
      "type": "KNOWS",
      "subject": "User",
      "object": "Simon",
      "metadata": {
        "relationshipType": "friend",
        "context": "introduced by Ola",
        "confidence": 0.95
      }
    },

    // LIKES relations
    {
      "type": "LIKES",
      "subject": "Simon",
      "object": "Italian food",
      "metadata": {
        "category": "food",
        "intensity": "passionate",
        "confidence": 0.9,
        "evidence": "makes incredible Italian food"
      }
    },
    {
      "type": "LIKES",
      "subject": "Ola",
      "object": "wine",
      "metadata": {
        "category": "food",
        "intensity": "moderate",
        "confidence": 0.8,
        "context": "drives to wine country"
      }
    },
    {
      "type": "LIKES",
      "subject": "Simon",
      "object": "wine",
      "metadata": {
        "category": "food",
        "intensity": "moderate",
        "confidence": 0.8,
        "context": "drives to wine country"
      }
    },
    {
      "type": "LIKES",
      "subject": "Ola",
      "object": "guitar",
      "metadata": {
        "category": "activity",
        "intensity": "strong",
        "confidence": 0.9
      }
    },

    // DISLIKES relations (allergies)
    {
      "type": "DISLIKES",
      "subject": "Ola",
      "object": "nuts",
      "metadata": {
        "category": "food",
        "severity": "extreme",
        "reason": "allergy",
        "confidence": 1.0
      }
    },
    {
      "type": "DISLIKES",
      "subject": "Simon",
      "object": "nuts",
      "metadata": {
        "category": "food",
        "severity": "extreme",
        "reason": "allergy",
        "confidence": 1.0
      }
    },

    // HAS_SKILL relations
    {
      "type": "HAS_SKILL",
      "subject": "Ola",
      "object": "Python programming",
      "metadata": {
        "domain": "programming",
        "level": "expert",
        "confidence": 1.0,
        "evidence": "has been teaching me for years"
      }
    },
    {
      "type": "HAS_SKILL",
      "subject": "Simon",
      "object": "cooking",
      "metadata": {
        "domain": "cooking",
        "specialty": "Italian cuisine",
        "level": "expert",
        "confidence": 1.0,
        "evidence": "is a chef"
      }
    },
    {
      "type": "HAS_SKILL",
      "subject": "Ola",
      "object": "guitar",
      "metadata": {
        "domain": "music",
        "level": "intermediate",
        "confidence": 0.8
      }
    },

    // OWNS relations
    {
      "type": "OWNS",
      "subject": "Ola",
      "object": "Tesla",
      "metadata": {
        "category": "vehicle",
        "confidence": 1.0
      }
    },
    {
      "type": "OWNS",
      "subject": "Simon",
      "object": "Tesla",
      "metadata": {
        "category": "vehicle",
        "confidence": 1.0
      }
    },
    {
      "type": "OWNS",
      "subject": "Ola",
      "object": "Fender Stratocaster guitar",
      "metadata": {
        "category": "instrument",
        "confidence": 1.0,
        "description": "beautiful"
      }
    },

    // HAS_IMPORTANT_DATE relations
    {
      "type": "HAS_IMPORTANT_DATE",
      "subject": "Ola",
      "object": "birthday",
      "metadata": {
        "date": "05-15",
        "recurring": true,
        "type": "birthday",
        "confidence": 1.0
      }
    },
    {
      "type": "HAS_IMPORTANT_DATE",
      "subject": "Ola",
      "object": "wedding anniversary",
      "metadata": {
        "date": "06-15",
        "year": 2018,
        "recurring": true,
        "type": "anniversary",
        "sharedWith": "Simon",
        "confidence": 1.0
      }
    },
    {
      "type": "HAS_IMPORTANT_DATE",
      "subject": "Simon",
      "object": "wedding anniversary",
      "metadata": {
        "date": "06-15",
        "year": 2018,
        "recurring": true,
        "type": "anniversary",
        "sharedWith": "Ola",
        "confidence": 1.0
      }
    },

    // ASSOCIATED_WITH relations
    {
      "type": "ASSOCIATED_WITH",
      "subject": "User",
      "object": "Warsaw",
      "metadata": {
        "type": "visited",
        "frequency": "once",
        "context": "tech conference",
        "confidence": 1.0
      }
    }
  ]
}
```

---

## ❓ Detailed Questions for You

### Question 1: Relationship Qualifiers (Comments)

You mentioned: "When I type Ola knows Simon, and they are married, there should be special relation or comment"

**Option A: Qualifier Field** ⭐ (My recommendation)
```typescript
KNOWS(Ola, Simon, {
  qualifier: "married", // Special tag
  since: 2018-06-15,
  comment: "Met at university, married 5 years ago" // Free text
})
```

**Option B: Separate Relation Type**
```typescript
MARRIED_TO(Ola, Simon, {
  since: 2018-06-15,
  comment: "..."
})
```

**Question:** Should "married", "siblings", "dating", "divorced" be:
1. Qualifiers on KNOWS (flexible)
2. Separate relation types (more explicit)

**Follow-up:**
- Do you want predefined qualifiers (dropdown) or free text?
- Should we support multiple qualifiers? (e.g., "colleague" AND "friend")

---

### Question 2: Skill Levels

For HAS_SKILL, how do you want to represent expertise?

**Option A: Simple Scale**
```typescript
level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master'
```

**Option B: Numeric (0-100)**
```typescript
level: 85 // Out of 100
```

**Option C: Years of Experience**
```typescript
yearsExperience: 10,
level: 'expert' // Derived
```

**Follow-up:**
- Should AI guess the level or ask user to confirm?
- Can users self-report skills? ("I'm good at Python")

---

### Question 3: Important Dates - What to Track?

You want HAS_IMPORTANT_DATE. Which types should we support in Phase 1?

**Proposed Types:**
- [ ] Birthday (recurring yearly)
- [ ] Anniversary (wedding, friendship, work)
- [ ] Memorial / remembrance days
- [ ] Custom events

**Question:**
- Should we auto-calculate age from birthday?
- Send reminders X days before? (How many days?)
- Support partial dates? (e.g., "sometime in May")

---

### Question 4: OWNS - What's Relevant?

What possessions are worth tracking?

**Proposed Categories:**
- [ ] Vehicles (car, bike, boat)
- [ ] Pets (dog, cat, etc.)
- [ ] Property (house, vacation home)
- [ ] Expensive equipment (camera, instruments, tools)
- [ ] Collections (vinyl, art, books)
- [ ] Business/company

**Question:**
- Should we track monetary value?
- Track purchase date / "since when"?
- Photo of the item?

**Use Cases:**
- "Who has a car?" (trip planning)
- "Who has a camera?" (photo projects)
- "Who has a dog?" (park meetups)

---

### Question 5: Preferences - Intensity Levels

For LIKES/DISLIKES, how granular should intensity be?

**Option A: 4 Levels** ⭐
```
mild, moderate, strong, passionate
```

**Option B: Numeric (0-100)**
```
confidence: 0.95 (95% sure)
intensity: 85 (out of 100)
```

**Option C: Emoji Scale**
```
😐 neutral
🙂 likes
❤️ loves
🔥 obsessed
```

**Question:**
- Should we distinguish between "confidence" (AI certainty) and "intensity" (how much they like it)?

---

### Question 6: Temporal Changes

Scenario: "Sarah was a meat-eater until 2024, now she's vegetarian"

**How to handle?**

**Option A: Replace** (Simple)
```typescript
// Delete old, insert new
DELETE LIKES(Sarah, meat)
INSERT DISLIKES(Sarah, meat, reason: "became vegetarian")
```

**Option B: Version with timestamps** ⭐
```typescript
LIKES(Sarah, meat, {
  valid_from: 2010-01-01,
  valid_to: 2024-01-01,
  status: 'historical'
})

DISLIKES(Sarah, meat, {
  valid_from: 2024-01-01,
  valid_to: null,
  status: 'current',
  reason: 'ethical'
})
```

**Question:**
- Do you care about historical preferences?
- Should timeline view show preference changes?

---

### Question 7: Data Entry - How to Add Relations?

**Scenario 1: After AI Extraction**
User writes story → AI extracts → User reviews suggestions

**Scenario 2: Manual Entry**
User clicks "Add Preference" button

**Question:**
- Should users be able to manually add relations without writing a story?
- What's the UI for manual entry?

**Proposed UI for Manual Entry:**
```
╔═══════════════════════════════════════════════════════════════╗
║  Add Relation                                         [X] Close ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Person: [Ola ▼]                                              ║
║                                                                 ║
║  Relation Type: [LIKES ▼]                                     ║
║                                                                 ║
║  What do they like?                                            ║
║  Item: [ice cream_________________]                           ║
║                                                                 ║
║  Category: [Food ▼]                                           ║
║  Intensity: [●●●●○] Strong                                    ║
║                                                                 ║
║  Notes/Comment:                                                ║
║  [Ola always orders vanilla gelato in Italy        ]          ║
║                                                                 ║
║                         [Cancel]  [Save]                       ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Question 8: Search & Filtering

**Use Cases:**
- "Who likes ice cream?"
- "Who's allergic to nuts?"
- "Who has a Tesla?"
- "Who knows Python?"
- "Show me everyone I met in 2015"

**Question:**
- Should search be natural language ("show me Python experts") or structured filters?
- Support boolean queries? ("likes ice cream AND lives in SF")

---

### Question 9: Privacy & Sharing

**Scenario:** You want to plan a dinner with Ola. Should Ola see:
- Your entire network?
- Only people you both know?
- Nothing (privacy-first)?

**Question:**
- Is this single-user only, or will people share networks in the future?
- Should there be an "export profile" feature to share with others?

---

### Question 10: Meal Planning - How Detailed?

You mentioned meal planning. How deep should we go?

**MVP Features:**
- [x] Show allergies and dietary restrictions
- [x] Show who likes what
- [x] Suggest safe dishes

**Advanced Features (Phase 2?):**
- [ ] Generate full recipes?
- [ ] Link to recipe websites?
- [ ] Track past successful meals?
- [ ] Generate shopping list with quantities?
- [ ] Integration with grocery delivery (Instacart, etc.)?

**Question:**
- What's the minimum viable meal planner for Phase 1?

---

## 🎨 Visualization Library Choices

### For Network Graph:
1. **React Flow** (recommended) - Modern, TypeScript, good perf
2. **D3.js** - More control, steeper learning curve
3. **Cytoscape.js** - Graph analysis built-in

### For Timeline:
1. **vis-timeline** - Feature-rich
2. **Custom D3.js** - Full control
3. **react-chrono** - Simple React component

### For Charts:
1. **Recharts** - Simple, React-friendly
2. **Victory** - Beautiful, modular
3. **Chart.js** - Classic, battle-tested

---

## 🎯 Summary: What We Need to Decide

1. ✅ **8 Relations for Phase 1** (confirmed)
2. ❓ **Relationship qualifiers:** Dropdown or free text?
3. ❓ **Skill levels:** Scale, numeric, or years?
4. ❓ **Important dates:** Which types to support?
5. ❓ **OWNS categories:** What's relevant to track?
6. ❓ **Preference intensity:** How to measure?
7. ❓ **Temporal changes:** Historical versioning or replace?
8. ❓ **Data entry:** AI-only or manual too?
9. ❓ **Search:** Natural language or structured?
10. ❓ **Meal planning:** MVP scope?

**Please answer these questions so we can finalize the schema!** 🎤
