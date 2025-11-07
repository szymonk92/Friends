# Pre-Implementation Checklist

**Everything to finalize before starting development**

---

## ✅ What You've Decided (Final Confirmation)

### Platform & Tech Stack
- ✅ **Platform:** Mobile-only (iOS + Android)
- ✅ **Framework:** Expo (React Native)
- ✅ **UI:** React Native Paper
- ✅ **Database:** expo-sqlite + Drizzle ORM
- ✅ **State:** TanStack Query + Zustand
- ✅ **Distribution:** App Store + Play Store
- ✅ **Desktop:** Deferred to Phase 2+

### Business Model
- ✅ **Free Tier:** 50 people, manual entry, local-only
- ✅ **Premium:** $4.99/mo - AI, cloud sync, unlimited
- ✅ **Pro:** $9.99/mo - Multi-device, collaboration

### Testing
- ✅ **Minimal** for most features
- ✅ **Unit tests** for encryption/decryption (CRITICAL)
- ✅ **Unit tests** for 5-minute auto-lock (CRITICAL)

### Next Step
- ✅ **Figma design first** (you're thinking about this)

---

## 📋 Pre-Implementation Checklist

### 1. **Design Phase (Figma)** ⭐ RECOMMENDED NEXT STEP

**What to design:**

#### **A. Core Screens (12 screens minimum)**

**Onboarding (3 screens):**
1. Welcome screen
2. How it works
3. Add first person

**Main App (5 screens):**
4. People list (home) - with tabs at bottom
5. Person detail - with tabs (Overview, Preferences, Timeline, Secrets)
6. Add/Edit person form
7. Add preference (with predefined library)
8. Search screen

**Features (4 screens):**
9. Timeline view (chronological)
10. Secrets unlock screen (password entry)
11. Secrets list (after unlock)
12. Settings

#### **B. States (Important!)**
- Empty states (no people, no preferences, no timeline events)
- Loading states (skeleton screens)
- Error states
- Success confirmations (snackbars)

#### **C. Components to Design**
- Person card (with photo, name, relationship type)
- Preference chip (with icon and label)
- Bottom navigation (People, Timeline, Settings)
- Floating Action Button (FAB for "Add Person")
- Modals/Bottom sheets
- Search bar

#### **D. Design System**
- Colors (primary, secondary, background, surface, error)
- Typography (headline, title, body, caption)
- Spacing (4px, 8px, 16px, 24px, 32px)
- Icons (consistent style)

**Figma Timeline:**
- Week 1: Wireframes (sketches, user flows)
- Week 2: High-fidelity designs + component library
- Total: 2 weeks

**Figma Resources:**
- Use Material Design 3 kit for React Native Paper
- Mobile frame: iPhone 14 Pro (393 × 852) or Pixel 7 (412 × 915)

---

### 2. **Document Cleanup** 🧹

**Outdated docs to update/remove:**

| Document | Status | Action Needed |
|----------|--------|---------------|
| `PRD.md` | Outdated | Update Phase 1 to mobile-only |
| `README.md` | Outdated | Update tech stack (Expo, not Electron) |
| `TASKS.md` | Outdated | Regenerate for mobile-first |
| `PHASE_1_TECH_STACK.md` | Outdated | Remove desktop references |
| `PLATFORM_STRATEGY.md` | Reference only | Keep for history |
| `DATABASE_SCHEMA_FINAL.md` | ✅ Current | Keep as-is |
| `RELATIONSHIP_LIFECYCLE.md` | ✅ Current | Keep as-is |
| `PRODUCTION_CONSIDERATIONS.md` | ✅ Current | Keep as-is |
| `MOBILE_FIRST_IMPLEMENTATION.md` | ✅ Current | **PRIMARY GUIDE** |
| `PHASE_3_4_FEATURES.md` | Future reference | Keep for later |

**Action:** Should I create updated versions of PRD.md, README.md, and TASKS.md for mobile-first approach?

---

### 3. **Edge Cases & Complex Scenarios** 🤔

**You mentioned thinking about edge cases and complicated human relations. Here are critical scenarios to consider:**

#### **A. Relationship Complexity**

**Scenario 1: Divorce with children**
- Mark and Sarah divorced
- But both are friends with you
- They co-parent (need to coordinate for kids' events)
- **Solution:** End relationship but keep both active, don't suggest together for events

**Scenario 2: Remarriage**
- Sarah divorced Mark, now married to Tom
- Mark is still your friend
- **Solution:** Track relationship history timeline
```
Sarah ──married──> Mark (2018-2024)
Sarah ──married──> Tom (2024-present)
```

**Scenario 3: Estranged family**
- Brother you don't talk to anymore
- Want to keep memories but never suggest
- **Solution:** Archive with reason "estranged", hideFromSuggestions = true

**Scenario 4: Friend group split**
- Alex and Maria had falling out
- Both are your friends
- Can't invite both to same event
- **Solution:** Track "complicated" connection between them

**Scenario 5: Secret relationships**
- Tom is dating Sarah (not public yet)
- You know, but shouldn't suggest them together publicly
- **Solution:** Mark connection as "private" or use Secrets

#### **B. Data Integrity Edge Cases**

**Scenario 1: Duplicate people**
- Added "Robert" and "Bob" - same person
- **Solution:** Merge people feature (copy all relations, delete duplicate)

**Scenario 2: Conflicting preferences**
- Month 1: "Ola likes coffee" (added manually)
- Month 3: "Ola dislikes coffee" (she quit caffeine)
- **Solution:** Keep history with timestamps, show most recent

**Scenario 3: Person deleted by accident**
- User deletes person with 50 relations
- **Solution:** Soft delete (30-day recovery window)

**Scenario 4: Name changes**
- Sarah got married, changed name
- Need to update name but keep all history
- **Solution:** Track name history, update display name

#### **C. Mobile-Specific Edge Cases**

**Scenario 1: Offline changes**
- User adds 10 people while offline
- Then goes online
- **Solution:** Local-first (SQLite), no sync issues in Phase 1

**Scenario 2: App deleted and reinstalled**
- User loses all data
- **Solution:** Phase 1 = accept data loss (local-only), Phase 2 = cloud backup

**Scenario 3: Storage full**
- User has 1000 photos
- Phone storage is full
- **Solution:** Compress images aggressively (100KB per photo max)

**Scenario 4: Large data export**
- User wants to export 500 people
- JSON file is huge
- **Solution:** Paginated export or ZIP file

#### **D. Privacy & Security Edge Cases**

**Scenario 1: Secrets accessed while phone unlocked**
- User unlocks secrets
- Leaves phone on table
- Friend picks up phone
- **Solution:** Auto-lock after 5 minutes (already planned!)

**Scenario 2: Screenshot of secrets**
- User unlocks secrets
- Takes screenshot
- **Solution:** Disable screenshots for secrets screen (React Native flag)

**Scenario 3: Export includes secrets**
- User exports JSON
- Accidentally shares file
- **Solution:** Exclude secrets from export by default, require explicit opt-in

**Scenario 4: Master password forgotten**
- User forgets password
- Secrets are permanently encrypted
- **Solution:** Warning on setup, no password recovery (by design for security)

#### **E. UX Edge Cases**

**Scenario 1: No people yet**
- New user opens app
- Empty state
- **Solution:** Friendly onboarding + "Add First Person" CTA

**Scenario 2: 50 people limit reached (free tier)**
- User tries to add 51st person
- **Solution:** Friendly upgrade prompt, explain limit

**Scenario 3: Name-only search**
- User searches "Sarah"
- Has 3 Sarahs in list
- **Solution:** Show all matches with differentiators (last name, photo, relationship type)

**Scenario 4: Accidental swipe/delete**
- User accidentally swipes person card
- Deletes by mistake
- **Solution:** Confirmation dialog for destructive actions

---

### 4. **Predefined Preference Library** 📚

**You need 100+ predefined items. Here's a starter:**

#### **Food (40 items)**
🍕 Italian food, 🍦 Ice cream, ☕ Coffee, 🍵 Tea, 🍰 Desserts, 🍫 Chocolate, 🍕 Pizza, 🍝 Pasta, 🍔 Burgers, 🌭 Hot dogs, 🍟 Fries, 🥗 Salads, 🥙 Middle Eastern, 🍜 Asian food, 🍱 Japanese/Sushi, 🍛 Indian food, 🌮 Mexican food, 🥘 Spanish food, 🥖 French food, 🍖 BBQ/Grilled meat, 🐟 Seafood, 🥩 Steak, 🍤 Shrimp, 🐓 Chicken, 🥚 Eggs, 🥓 Bacon, 🧀 Cheese, 🥛 Dairy, 🍞 Bread, 🥐 Pastries, 🍩 Donuts, 🥤 Soda, 🍺 Beer, 🍷 Wine, 🍸 Cocktails, 🥃 Whiskey, 🍹 Fruity drinks, 🧃 Juice, 🥤 Energy drinks, 🍪 Cookies

#### **Dietary Restrictions (10 items)**
🥕 Vegetarian, 🌱 Vegan, 🌾 Gluten-free, 🥜 Nut allergy, 🦞 Shellfish allergy, 🥛 Lactose intolerant, 🚫 No pork, 🚫 No beef, 🌶️ No spicy food, 🍬 No sugar

#### **Activities (40 items)**
⛰️ Hiking, 🏊 Swimming, 🚴 Cycling, 🏃 Running, 🧘 Yoga, 🏋️ Gym/Fitness, ⚽ Soccer, 🏀 Basketball, 🎾 Tennis, 🏓 Table tennis, 🎳 Bowling, ⛳ Golf, 🏐 Volleyball, 🏈 Football, ⚾ Baseball, 🏒 Hockey, 🎿 Skiing, 🏂 Snowboarding, 🧗 Rock climbing, 🏄 Surfing, 🚣 Kayaking, 🛶 Canoeing, 🏕️ Camping, 🎣 Fishing, 🏹 Archery, 🎯 Darts, 🎮 Video games, 🎲 Board games, ♟️ Chess, 🃏 Card games, 🎨 Painting, ✏️ Drawing, 📸 Photography, 🎬 Filmmaking, 🎭 Theater, 🎪 Circus, 💃 Dancing, 🎤 Karaoke, 🎸 Playing guitar, 🎹 Playing piano

#### **Music Genres (10 items)**
🎵 Pop, 🎸 Rock, 🎤 Hip-hop, 🎷 Jazz, 🎻 Classical, 🎶 Country, 🎧 Electronic/EDM, 🥁 Metal, 🎺 Blues, 🎼 R&B

#### **Media (10 items)**
📺 TV shows, 🎬 Movies, 📚 Reading/Books, 📰 News, 🎙️ Podcasts, 📻 Radio, 📱 Social media, 🎮 Gaming, 📸 Photography, 🎨 Art

**Total: 110 items** (meets your goal!)

**Implementation:**
```typescript
// lib/constants/preferences.ts
export const PREFERENCE_LIBRARY = {
  food: [
    { id: 'italian', label: 'Italian food', icon: '🍕', category: 'food' },
    { id: 'ice_cream', label: 'Ice cream', icon: '🍦', category: 'food' },
    // ... rest
  ],
  dietary_restrictions: [
    { id: 'vegetarian', label: 'Vegetarian', icon: '🥕', category: 'dietary' },
    // ...
  ],
  activities: [
    { id: 'hiking', label: 'Hiking', icon: '⛰️', category: 'activity' },
    // ...
  ],
  // ... rest
};
```

---

### 5. **User Flows to Map** 🗺️

**Critical flows to design in Figma:**

#### **Flow 1: Onboarding**
```
Open app → Welcome → How it works → Add first person → Done
```

#### **Flow 2: Add Person + Preferences**
```
People list → Tap FAB → Fill name → Add photo → Save
→ Person detail → Add preference (from library) → Save
```

#### **Flow 3: View Person Timeline**
```
People list → Tap person card → Swipe to Timeline tab
→ See chronological events
```

#### **Flow 4: Search Person**
```
People list → Tap search → Type name → See results → Tap result
```

#### **Flow 5: Secrets (Critical Flow)**
```
Person detail → Secrets tab → Enter master password → Unlock
→ View secrets → Add new secret → Auto-lock after 5 min
```

#### **Flow 6: Archive Person**
```
Person detail → Options menu → Archive → Confirm reason
→ Person removed from list
```

#### **Flow 7: End Relationship (Between People)**
```
Person detail → Connections section → Tap connection
→ "End Relationship" → Select reason (divorce/breakup/falling out)
→ Confirm → Connection marked as "ended"
```

---

### 6. **Data Model Review** 🗄️

**Confirm database schema is ready:**

✅ **12 tables defined:**
1. users (local user)
2. people (with lifecycle: active/archived/deceased)
3. connections (with status: active/inactive/ended/complicated)
4. relations (8 types: KNOWS, LIKES, DISLIKES, etc.)
5. stories (for future AI)
6. secrets (encrypted)
7. contactEvents (relationship health)
8. relationshipHistory (audit trail)
9. events (smart event planner)
10. files (photos)
11. magicLinkTokens (future auth)
12. sessions (future auth)

**Action:** Copy schema from `docs/DATABASE_SCHEMA_FINAL.md` when you start coding.

---

### 7. **Development Environment Setup** 💻

**Before coding, you'll need:**

```bash
# 1. Node.js (v18+)
node --version

# 2. Expo CLI
npm install -g expo-cli

# 3. iOS development (macOS only)
xcode-select --install

# 4. Android development
# Download Android Studio
# Set up Android emulator

# 5. Git
git --version

# 6. Code editor
# VS Code recommended with extensions:
# - ES7+ React/Redux/React-Native snippets
# - Prettier
# - ESLint
# - React Native Tools
```

**Test Expo:**
```bash
npx create-expo-app@latest test-app
cd test-app
npx expo start
# Press 'i' for iOS or 'a' for Android
```

---

### 8. **Decide on Drag-and-Drop UX** 🎨

**For mobile, "drag-and-drop" might not be ideal. Consider alternatives:**

#### **Option A: True Drag-and-Drop** (Complex on mobile)
- Requires react-native-gesture-handler + Reanimated
- Can be laggy on older devices
- More work to implement

#### **Option B: Tap-Based Selection** ⭐ RECOMMENDED
- Tap chips to add to person
- Simpler, more reliable
- Better mobile UX

**Recommended Mobile UX:**
```
Add Preference Screen:

[Search: ___________]

FOOD
[🍕 Italian] [🍦 Ice cream] [☕ Coffee] [🍕 Pizza]
[🍝 Pasta] [🍔 Burgers] ...

ACTIVITIES
[⛰️ Hiking] [🏊 Swimming] [🚴 Cycling] ...

Tap chip → Highlight it → Tap "LIKES" or "DISLIKES" button at bottom
```

**Question for you:** Drag-and-drop or tap-based?

---

### 9. **Timeline Estimate Confirmation** ⏱️

**Updated timeline for mobile-first:**

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Figma Design** | 2 weeks | 12 screens, component library |
| **Setup** | 1 week | Expo project, dependencies |
| **Database** | 1 week | Schema, migrations, local user |
| **Core CRUD** | 2 weeks | People list, detail, add/edit |
| **Preferences** | 2 weeks | Library, add/remove, display |
| **Photos** | 1 week | Upload, optimize, display |
| **Search** | 1 week | Search bar, filtering |
| **Secrets** | 2 weeks | Encryption, unlock, auto-lock, TESTS |
| **Timeline** | 1 week | Chronological view |
| **Polish** | 2 weeks | Onboarding, empty states, settings |
| **Testing** | 1 week | Bug fixes, TestFlight |
| **TOTAL** | **16 weeks** | **~4 months** |

Add 2 weeks for Figma = **18 weeks total (~4.5 months)**

---

### 10. **Final Decisions Needed** ❓

Before starting Figma, decide:

1. **Color scheme?**
   - Material Design default (purple/teal)
   - Custom brand colors?

2. **App name finalized?**
   - "Friends" (simple)
   - "Friends+" (suggests more features)
   - "MyCircle" (alternative)
   - Something else?

3. **App icon?**
   - Two people emoji 👥
   - Heart with people ❤️👥
   - Custom design?

4. **Drag-and-drop vs tap-based?**
   - Drag-and-drop (more complex)
   - Tap-based (simpler, recommended)

5. **Master password setup?**
   - Required on first launch (secure by default)
   - Optional (user can enable later)

---

## ✅ Recommended Next Steps

### **This Week:**
1. **Finalize 5 decisions above** (colors, name, icon, UX, password)
2. **Set up Figma** (create account, install Material Design kit)
3. **Start wireframes** (low-fidelity sketches of 12 screens)

### **Next Week:**
4. **High-fidelity designs** (colors, components, polish)
5. **Prototype** (link screens together)
6. **User testing** (show to friends, get feedback)

### **Week 3:**
7. **Finalize designs**
8. **Set up dev environment** (Expo, Android Studio, Xcode)
9. **Start coding!**

---

## 📚 Document Cleanup Recommendation

**Should I create these updated docs?**

1. ✅ **Updated PRD.md** - Mobile-first product requirements
2. ✅ **Updated README.md** - Expo tech stack, setup instructions
3. ✅ **Updated TASKS.md** - Mobile-first task breakdown (150+ tasks)
4. ✅ **Remove outdated desktop references** from other docs

**Let me know if you want me to generate these!**

---

## 🎯 Summary: What You Need Before Coding

### **Must Have:**
- ✅ Figma designs (12 screens + components)
- ✅ Predefined preference library (110+ items - provided above)
- ✅ Edge cases considered (documented above)
- ✅ User flows mapped (7 critical flows - documented above)
- ✅ Dev environment set up (Node, Expo, emulators)

### **Nice to Have:**
- ⚠️ Updated documentation (I can generate)
- ⚠️ Brand assets (logo, colors, name)
- ⚠️ Beta testers lined up (friends/family)

### **Can Wait:**
- ❌ App Store accounts (do this closer to launch)
- ❌ Domain name (if you want website later)
- ❌ Social media accounts

---

**Ready to start Figma? Let me know:**
1. Do you want me to update the outdated docs?
2. Need help with Figma setup/resources?
3. Any other edge cases to consider?
4. What are your answers to the 5 final decisions?

🎨 Let's design!
