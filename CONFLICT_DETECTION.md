# Conflict Detection System

## Overview

The Friends app implements a **comprehensive conflict detection system** that uses deep logical reasoning to identify contradictions, ingredient-level conflicts, and dietary restriction violations.

## Why Conflict Detection Matters

When storing information about people, it's easy to accidentally record conflicting facts:

- ❌ "John is allergic to potatoes" + "John loves fries" → **CONFLICT** (fries contain potatoes!)
- ❌ "Sarah is vegan" + "Sarah loves cheese" → **CONFLICT** (cheese is dairy!)
- ❌ "Mike is lactose intolerant" + "Mike regularly drinks milk" → **CONFLICT**

Our system detects these conflicts **automatically** using:
1. **Ingredient-level reasoning** (fries → potatoes)
2. **Dietary restriction implications** (vegan → no dairy/eggs/meat)
3. **Logical consistency checking**

---

## Architecture

### Components

1. **`food-knowledge.ts`** - Food ingredient database
   - Maps foods to ingredients (e.g., fries → potato, oil, salt)
   - Tracks ingredient derivatives (e.g., dairy → milk, cheese, butter, ice cream)
   - Defines dietary restrictions and their implications

2. **`conflict-detection.ts`** - Conflict detection engine
   - Detects 5 types of conflicts:
     - Direct contradictions (LIKES vs DISLIKES)
     - Ingredient-level conflicts (allergy vs food containing that ingredient)
     - Dietary restriction violations (vegan vs cheese)
     - Logical implications (can't be both vegan and meat-eater)
     - Temporal conflicts (USED_TO_BE vs IS)

3. **`conflict-resolution.ts`** - Resolution utilities
   - Suggests resolutions for detected conflicts
   - Filters out conflicting relations
   - Creates user-friendly explanations

4. **Enhanced AI prompts** - Claude is instructed to detect conflicts
   - Ingredient-level reasoning examples
   - Dietary restriction implications
   - Edge case handling

---

## Conflict Types

### 1. Direct Contradictions

**Definition:** Opposite relation types about the same object

**Examples:**
- `LIKES: ice cream` vs `DISLIKES: ice cream`
- `IS: vegan` vs `IS: meat-eater`

**Severity:** CRITICAL

**Resolution:** Requires user review

---

### 2. Ingredient-Level Conflicts

**Definition:** A restriction on an ingredient conflicts with liking a food containing that ingredient

**Examples:**

#### Example 1: Potato Allergy vs Fries
```typescript
Existing: SENSITIVE_TO: "potatoes"
New:      LIKES: "fries"
→ CONFLICT! Fries are made from potatoes
```

#### Example 2: Dairy Sensitivity vs Ice Cream
```typescript
Existing: SENSITIVE_TO: "dairy"
New:      LIKES: "ice cream"
→ CONFLICT! Ice cream contains milk and cream
```

#### Example 3: Peanut Allergy vs Peanut Butter
```typescript
Existing: SENSITIVE_TO: "peanuts"
New:      REGULARLY_DOES: "eats peanut butter"
→ CONFLICT! Peanut butter is made from peanuts
```

**How It Works:**

The system uses a **derivative mapping**:

```typescript
'potato' → ['fries', 'chips', 'hash browns', 'mashed potatoes', 'potato salad']
'dairy'  → ['milk', 'cheese', 'butter', 'yogurt', 'ice cream', 'cream']
'pork'   → ['bacon', 'ham', 'sausage', 'pepperoni', 'salami']
```

**Severity:** HIGH (potential health risk)

**Resolution:** User review required

---

### 3. Dietary Restriction Conflicts

**Definition:** A dietary identity conflicts with a food preference

**Examples:**

#### Example 1: Vegan vs Cheese
```typescript
Existing: IS: "vegan"
New:      LIKES: "cheese"
→ CONFLICT! Vegans don't eat dairy products
```

#### Example 2: Vegetarian vs Fish
```typescript
Existing: IS: "vegetarian"
New:      LIKES: "sushi"
→ CONFLICT! Most sushi contains fish
```

#### Example 3: Lactose Intolerant vs Milk
```typescript
Existing: IS: "lactose intolerant"
New:      REGULARLY_DOES: "drinks milk"
→ CONFLICT! Lactose intolerant people can't digest lactose
```

**Dietary Restrictions Database:**

| Restriction | Excludes |
|------------|----------|
| Vegan | meat, dairy, eggs, honey, gelatin |
| Vegetarian | meat, fish, seafood, gelatin |
| Pescatarian | meat (but fish is OK) |
| Lactose Intolerant | dairy, milk, lactose |
| Kosher | pork, shellfish |
| Halal | pork, alcohol |
| Gluten-Free | gluten, wheat, barley, rye |

**Severity:** HIGH

**Resolution:** User review required

---

### 4. Logical Implications

**Definition:** Two facts that are mutually exclusive

**Examples:**
- Cannot be both `IS: vegan` and `IS: meat-eater`
- Cannot both `BELIEVES: climate change is real` and `BELIEVES: climate change is a hoax`

**Severity:** MEDIUM

**Resolution:** User review required

---

### 5. Temporal Conflicts

**Definition:** A past state conflicts with a current state

**Examples:**
```typescript
Existing: IS: "vegan" (current)
New:      USED_TO_BE: "vegan"
→ CONFLICT! Can't currently be something you used to be
```

**Severity:** LOW

**Resolution:** Auto-resolvable (mark old as past)

---

## Real-World Edge Cases

### Edge Case 1: Complex Food Composition

**Scenario:** Person is allergic to potatoes

**Foods to check:**
- ✅ Fries → Contains potato
- ✅ Potato chips → Contains potato
- ✅ Hash browns → Contains potato
- ✅ Mashed potatoes → Contains potato
- ✅ Potato salad → Contains potato
- ❌ Pizza → Does NOT contain potato

### Edge Case 2: Multi-Ingredient Conflicts

**Scenario:** Person is both gluten-free and lactose intolerant

**Pizza check:**
```typescript
Pizza ingredients: [wheat, cheese, tomato]

Conflicts:
1. Wheat → Gluten (violates gluten-free)
2. Cheese → Dairy (violates lactose intolerant)

Result: 2 conflicts detected
```

### Edge Case 3: Vegan Edge Cases

**Scenario:** Person is vegan

**Common conflicts:**
- ❌ Cheese (dairy)
- ❌ Ice cream (dairy)
- ❌ Eggs
- ❌ Honey
- ❌ Bacon (meat)
- ❌ Gelatin (animal product)
- ✅ Tofu (plant-based)
- ✅ Veggie burger (plant-based)

### Edge Case 4: Religious Dietary Laws

**Kosher:**
- ❌ Pork
- ❌ Shellfish
- ❌ Mixing meat and dairy

**Halal:**
- ❌ Pork
- ❌ Alcohol

---

## AI Integration

The conflict detection system integrates with Claude AI in two ways:

### 1. Prompt Engineering

The AI extraction prompt includes:
- Detailed conflict detection instructions
- Ingredient-level reasoning examples
- Edge case scenarios
- Explicit reasoning requirements

Example from prompt:
```
⚠️ CRITICAL: CONFLICT DETECTION WITH DEEP REASONING ⚠️

INGREDIENT-LEVEL CONFLICTS (CRITICAL!)
Think about what foods CONTAIN:
- "SENSITIVE_TO: potatoes" conflicts with "LIKES: fries"
  → WHY? Fries are made from potatoes!
```

### 2. Post-Processing Validation

After AI extraction, the system:
1. Takes AI-detected conflicts
2. Runs local conflict detection engine
3. Merges results
4. Validates against food knowledge base
5. Suggests resolutions

```typescript
// AI detects conflicts during extraction
const aiResult = await extractRelationsFromStory(story, people, relations);

// Local engine validates
const conflicts = detectConflicts(newRelation, existingRelations);

// Merge and process
const allConflicts = mergeConflictSources(aiResult.conflicts, conflicts);
```

---

## Usage Examples

### Example 1: Validate Before Adding

```typescript
import { validateRelation } from '@/lib/ai/conflict-detection';

const newRelation = {
  relationType: 'LIKES',
  objectLabel: 'fries',
};

const existingRelations = [
  {
    relationType: 'SENSITIVE_TO',
    objectLabel: 'potato',
    status: 'current',
  },
];

const result = validateRelation(newRelation, existingRelations);

if (!result.valid) {
  console.log('Cannot add:', result.conflicts[0].description);
  // Output: "Cannot like fries while being sensitive to potato (fries are made from potatoes)"
}
```

### Example 2: Find All Conflicts

```typescript
import { findAllConflicts } from '@/lib/ai/conflict-detection';

const allConflicts = findAllConflicts(personRelations);

console.log(`Found ${allConflicts.length} conflicts`);
allConflicts.forEach(conflict => {
  console.log(`- ${conflict.description}`);
});
```

### Example 3: Check Food Compatibility

```typescript
import { findConflictingFoods } from '@/lib/ai/food-knowledge';

const foods = ['fries', 'pizza', 'salad', 'ice cream'];
const conflicts = findConflictingFoods('vegan', foods);

conflicts.forEach(({ food, reason }) => {
  console.log(`${food}: ${reason}`);
});

// Output:
// pizza: Contains dairy (No animal products)
// ice cream: Contains dairy (No animal products)
```

---

## Testing

Comprehensive test suite in `lib/ai/__tests__/conflict-detection.test.ts`

**Test Coverage:**
- ✅ Ingredient detection (fries → potatoes)
- ✅ Dietary restrictions (vegan → no cheese)
- ✅ Direct contradictions (LIKES vs DISLIKES)
- ✅ Temporal conflicts (IS vs USED_TO_BE)
- ✅ Complex scenarios (multiple allergies)
- ✅ Real-world edge cases

**Run tests:**
```bash
npm test -- conflict-detection.test.ts
```

---

## Performance Considerations

### Food Database Size

Current database: ~50 common foods, ~20 ingredients

**Memory footprint:** < 10 KB

**Lookup time:** O(1) for exact matches, O(n) for derivative checking (n = average 5-10 items)

### Conflict Detection Complexity

**Time complexity:** O(n × m) where:
- n = number of new relations
- m = number of existing relations per person

**Typical case:** < 1ms for 100 relations

### Scaling Strategy

For larger deployments:
1. Pre-compute ingredient graphs
2. Use indexed lookups for common conflicts
3. Cache dietary restriction rules
4. Batch conflict detection

---

## Future Enhancements

### Planned Features

1. **Machine Learning Integration**
   - Learn new ingredient relationships from user corrections
   - Adapt to regional food variations

2. **Expanded Food Database**
   - International cuisines
   - Branded foods
   - Restaurant menu items

3. **Confidence Scoring**
   - Probabilistic conflict detection
   - "Likely contains" vs "Definitely contains"

4. **User Customization**
   - Define custom dietary restrictions
   - Add custom ingredient mappings

5. **Conflict Resolution Workflows**
   - Guided resolution flows
   - Batch conflict resolution
   - AI-suggested resolutions

---

## Contributing

### Adding New Foods

Edit `lib/ai/food-knowledge.ts`:

```typescript
export const FOOD_DATABASE: Record<string, FoodItem> = {
  'your-food': {
    name: 'your-food',
    ingredients: ['ingredient1', 'ingredient2'],
    categories: ['category'],
    aliases: ['alias1', 'alias2'],
  },
};
```

### Adding New Dietary Restrictions

```typescript
export const DIETARY_RESTRICTIONS: Record<string, DietaryRestriction> = {
  'your-restriction': {
    name: 'your-restriction',
    excludedIngredients: ['ingredient1', 'ingredient2'],
    excludedCategories: ['category'],
    description: 'Description of restriction',
  },
};
```

---

## References

- [Food Allergy Research](https://www.foodallergy.org/)
- [Vegan Society Guidelines](https://www.vegansociety.com/)
- [Kosher Dietary Laws](https://www.ou.org/kosher/)
- [Halal Food Standards](https://halalfoodauthority.com/)

---

**Last Updated:** November 2025
**Version:** 1.0
**Status:** Production Ready
