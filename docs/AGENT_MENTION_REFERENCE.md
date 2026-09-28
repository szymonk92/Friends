# Agent Reference Guide: Using @mentions in Stories

**Version**: 1.0  
**Last Updated**: November 2025  
**Purpose**: Quick reference for AI agents to mention people in stories with clarity and avoid ambiguity

---

## 🎯 Quick Start: How to Reference People

When writing stories in the Friends app, mention people using `@name` or `@nickname` syntax. This helps the AI extraction system:
1. Identify who you're talking about
2. Avoid ambiguity when multiple people have similar names
3. Create accurate person records automatically

### Basic Format

```
I met with @name or @nickname and we talked about...
```

### Examples

```markdown
"I went hiking with @Sarah and @Mark. We had ice cream after."

"@Ola told me about her trip to Italy last week."

"My colleague @alex (goes by Alex_dev) loves Python."
```

---

## 📋 Reference Rules for Agents

### Rule 1: Use @mention Format

Always use `@` prefix when introducing or first mentioning a person:

✅ **Good**:
```
I met @Sarah for lunch. Sarah suggested trying the new Italian place downtown.
```

⚠️ **Acceptable** (after first mention):
```
I met @Sarah for lunch. She suggested trying the new Italian place.
```

❌ **Avoid** (no clarity on who):
```
I went to lunch. Someone suggested the Italian place.
```

---

### Rule 2: Include Nickname if Relevant

If a person has a nickname or goes by multiple names, include it:

✅ **Clear**:
```
@John (goes by @J at work) and @Sarah met for coffee.
```

✅ **Clear with context**:
```
@Jennifer, who everyone calls @Jen, loves hiking.
```

---

### Rule 3: Disambiguate Similar Names

If you're referencing someone with a common name and there are multiple matches, add context:

✅ **Clear**:
```
@Sarah (my college roommate) vs @Sarah (my coworker)
```

✅ **Clear with relationship**:
```
@John from the running club, not @John from work.
```

---

### Rule 4: Use Consistent Names in Same Story

Within a single story, stick to one name for the same person:

✅ **Consistent**:
```
I had dinner with @Sarah. Sarah mentioned her new job. She loves it so far.
```

❌ **Inconsistent**:
```
I had dinner with @Sarah. @Sar mentioned her new job. She loves it so far.
```

---

### Rule 5: Reference Placeholder People

When mentioning someone you haven't met or don't have full details about:

✅ **Clear placeholder**:
```
@Sarah's mother came to visit. She (Sarah's mom) has dementia.
```

✅ **Clear with relationship**:
```
@Mark's brother @Tom joined us for hiking.
```

---

## 🔍 When to Use @mention

### ✅ Use @mention for:

| Scenario | Example |
|----------|---------|
| Primary person in story | `I met @Sarah for coffee` |
| Multiple people | `@John, @Emma, and @Mark went hiking` |
| Relationship context | `@Sarah's mom, @Emma's coworker` |
| Disambiguation | `@Sarah (college), @Sarah (work)` |
| Nicknames | `@Alex (goes by @Lex)` |
| Group interactions | `We (me, @Sarah, @John) celebrated` |

### ❌ Avoid @mention for:

| Scenario | Example |
|----------|---------|
| Generic people | ❌ `Someone said...` instead use `@PersonName said...` |
| Pronouns only | ❌ `She loves ice cream` (without prior @mention) |
| Vague references | ❌ `My friend` instead use `@FriendName` |

---

## 🤖 AI Extraction Context

### For AI Agents Creating Stories

When generating or translating stories, follow these guidelines:

#### 1. Structure for Easy Extraction

```markdown
✅ Good structure:
"I met @Ola 10 years ago in university. 
Ola is passionate about travel—we've been to Italy together multiple times. 
Each time, @Ola insists on visiting our favorite gelato shop."

❌ Poor structure:
"We met ages ago and traveled together. 
They love Italy and ice cream I guess."
```

#### 2. Quantity: When to Mention

- **First mention**: Always use `@name`
- **Subsequent mentions**: Can use pronouns after clear introduction
- **Multiple people**: Use @mention at least once per person

#### 3. Be Specific About Relationships

```markdown
✅ Clear:
"@Sarah (my college roommate) and @Mark (my brother) went hiking."

❌ Vague:
"My friend and my family member went hiking."
```

#### 4. Include Context for Accuracy

```markdown
✅ Extractable:
"@John (my manager) prefers working from home. 
He's mentioned this preference several times."

❌ Extractable:
"John likes working from home."
(Don't know if this is same John as in existing data)
```

---

## 📝 Common Story Patterns

### Pattern 1: Introducing Multiple People

```markdown
I had dinner with @Sarah, @Mark, and @Ola.
- @Sarah brought her famous lasagna
- @Mark is a vegetarian
- @Ola loves trying new wines
```

### Pattern 2: Relationship Timeline

```markdown
I met @John 5 years ago at a conference.
@John and I have stayed in touch.
Recently, @John told me he's moving to California.
```

### Pattern 3: Group Activity with Observations

```markdown
Went hiking with @Emma, @Tom, and @Lisa.
@Emma is really into bird watching.
@Tom struggled with the steep parts.
@Lisa knows all the trails in this area.
```

### Pattern 4: Person-Specific Preferences

```markdown
@Sarah came over for dinner.
@Sarah is vegetarian and loves Italian food.
She mentioned she's allergic to nuts.
```

---

## 🎓 Examples for Reference

### Example 1: Simple Story

**User input**: "Had coffee with my friend Sarah who loves ice cream"

**Improved for AI**:
```
I had coffee with @Sarah. 
@Sarah loves ice cream and always gets a scoop after meals.
```

**What AI extracts**:
- Person: Sarah
- Preference: Likes ice cream
- Activity: Coffee together
- Strength: Positive relationship

---

### Example 2: Complex Network

**User input**: "Sarah, Mark, and Emma all know each other from college"

**Improved for AI**:
```
@Sarah, @Mark, and @Emma all met in college and stayed friends.
They have known each other for about 10 years.
```

**What AI extracts**:
- Relationships: Sarah ↔ Mark, Sarah ↔ Emma, Mark ↔ Emma
- Shared history: 10 years, met at college
- Network strength: Strong (maintained friendship)

---

### Example 3: Preferences & Details

**User input**: "Went to dinner with Ola. She's been to Italy lots. Loves gelato."

**Improved for AI**:
```
Dinner with @Ola. 
@Ola has traveled to Italy multiple times and loves it.
@Ola's favorite treat is gelato—she has strong opinions about which shops are best.
```

**What AI extracts**:
- Person: Ola
- Preferences: Likes Italy, Loves gelato
- Activity: Dinner together
- Travel history: Multiple trips to Italy
- Personality: Has strong opinions about gelato

---

## 🚨 Conflict Resolution for Agents

### Issue: Multiple People with Same Name

**Problem**: Story mentions "@John" but there are 3 Johns in the system

**Solution**:
```markdown
✅ Add distinguishing context:

"I saw @John (my brother) at the wedding.
@John from work was also there, but we didn't talk much."

This creates:
1. John (brother)
2. John (from work)
```

### Issue: Nickname vs Full Name

**Problem**: Person records show "Jonathan" but story says "@John"

**Solution**: The system will auto-link if:
- High confidence nickname match (Jonathan → John)
- User has previous mention of nickname
- Multiple hints in story context

**When uncertain**: Use both in first mention:
```markdown
"@John (goes by @Jonathan professionally) joined the team."
```

---

## 🔗 Integration with Relations

### How @mentions Feed into Relations

When you write a story with @mentions:

```markdown
"I went hiking with @Sarah and @Mark.
@Sarah mentioned she's vegetarian.
@Mark brought his famous chocolate cookies."
```

The system automatically creates relations like:

```
@Sarah → IS → vegetarian
@Mark → HAS_SKILL → baking  (implied from "famous cookies")
@Mark → REGULARLY_DOES → bring_cookies_to_events
STORY_LINK: @Sarah ←→ @Mark (shared experience: hiking)
```

**See**: [RELATION_USAGE_GUIDE.md](RELATION_USAGE_GUIDE.md) for detailed relation extraction rules

---

## 📌 Checklist for AI Agents

Before finalizing a story, verify:

- [ ] All people mentioned have `@name` on first mention
- [ ] Names are consistent throughout the story
- [ ] Similar names are disambiguated (e.g., "John from work" vs "John my brother")
- [ ] Context is clear for AI extraction
- [ ] Nicknames or alternate names are included if relevant
- [ ] Relationship context is provided (colleague, friend, family, etc.)
- [ ] Preferences/observations are specific, not vague
- [ ] Story has enough detail for meaningful extraction

---

## 💡 Pro Tips for Better Stories

1. **Be specific about relationships**
   - ❌ "My friend loves hiking"
   - ✅ "@Sarah (college friend) loves hiking"

2. **Use @mentions to clarify pronouns**
   - ❌ "She went there and they did something"
   - ✅ "@Sarah went there with @Mark and they went hiking"

3. **Group similar observations**
   ```markdown
   # Good structure:
   I had dinner with @Sarah and @Emma.
   Observations about @Sarah:
   - She's vegetarian
   - She loves wine
   
   Observations about @Emma:
   - She's new to the city
   - She's interested in rock climbing
   ```

4. **Link stories with shared context**
   ```markdown
   "Last week @Sarah and I went to Italy together.
   (This was the trip @Sarah has mentioned multiple times before)"
   ```

---

## 🎯 Future Enhancements

Planned features for agent-friendly mentions:

- [ ] Auto-suggest person names as you type (in UI)
- [ ] Context-aware nickname resolution
- [ ] Automatic de-duplication when mentioning similar names
- [ ] Relationship type inference from mention context
- [ ] Stories with @mentions trigger priority extraction

---

## 📞 Questions & Support

For unclear scenarios:

1. **Check**: [RELATION_USAGE_GUIDE.md](RELATION_USAGE_GUIDE.md) for relation type decisions
2. **Reference**: Examples in this document
3. **Fallback**: When uncertain, add extra context markers:
   ```markdown
   "@John [NOT the @John from work] told me about..."
   "@Sarah (relationship: close friend, years known: 15)"
   ```

---

**Last Updated**: November 2025  
**Next Review**: After Phase 1 completion and initial user feedback
