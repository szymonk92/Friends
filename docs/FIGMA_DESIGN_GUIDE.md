# Figma Design Guide - Friends App

**Complete wireframes, descriptions, and Figma project setup**

---

## 🎨 How to Set Up Figma Project

### **Step 1: Create Figma Account**
1. Go to https://figma.com
2. Sign up (free plan is enough for this project)
3. Create new Design file: **"Friends App - Mobile"**

### **Step 2: Install Material Design 3 Kit**
1. Go to https://www.figma.com/community/file/1035203688168086460
2. Click "Duplicate" to add to your files
3. This gives you all React Native Paper components!

### **Step 3: Set Up Your File**

**Create these pages in your Figma file:**
- 📱 **Wireframes** (low-fidelity, this week)
- 🎨 **High-Fidelity** (polished designs, next week)
- 🧩 **Components** (reusable elements)
- 🔄 **User Flows** (screen connections)
- 📏 **Design System** (colors, typography, spacing)

### **Step 4: Set Mobile Frame**
- Frame size: **iPhone 14 Pro** (393 × 852 px)
- Or: **Pixel 7** (412 × 915 px)
- Use consistent frame for all screens

---

## 📱 Complete Screen Wireframes & Descriptions

### **Phase 1: Onboarding (3 Screens)**

---

#### **Screen 1: Welcome**

```
┌─────────────────────────────────────┐
│            Status Bar               │ ← System status
├─────────────────────────────────────┤
│                                     │
│                                     │
│                                     │
│             [App Logo]              │ ← Big icon
│                                     │
│           Friends                   │ ← App name (big)
│                                     │
│                                     │
│      Keep track of the people       │ ← Tagline
│         you care about.             │
│      Never forget what matters.     │
│                                     │
│                                     │
│                                     │
│                                     │
│      ●  ○  ○                        │ ← Page indicators
│                                     │
│  ┌───────────────────────────────┐ │
│  │      Get Started →            │ │ ← Primary CTA button
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** First impression, explain value proposition
- **Elements:**
  - Large app logo/icon (center top)
  - App name "Friends" (large, bold)
  - 3-line value proposition
  - Page indicators (3 dots, first one filled)
  - Primary button "Get Started"
- **Copy:**
  - Headline: "Friends"
  - Subheadline: "Keep track of the people you care about. Never forget what matters."
- **Colors:**
  - Background: White (#FFFFFF)
  - Primary button: Material Purple (#6200EE)
  - Text: Dark gray (#1C1B1F)

---

#### **Screen 2: How It Works**

```
┌─────────────────────────────────────┐
│            Status Bar               │
├─────────────────────────────────────┤
│                                     │
│      How Friends Works              │ ← Header
│                                     │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   👥                         │  │
│  │   People you know            │  │ ← Feature 1
│  │   Add friends, family,       │  │
│  │   colleagues                 │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   ❤️                          │  │
│  │   What they like or dislike  │  │ ← Feature 2
│  │   Remember their preferences │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   🔗                         │  │
│  │   How they're connected      │  │ ← Feature 3
│  │   Track relationships        │  │
│  └──────────────────────────────┘  │
│                                     │
│      ●  ●  ○                        │ ← Page indicators
│                                     │
│  ┌───────────────────────────────┐ │
│  │      Continue →               │ │ ← CTA button
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** Explain core features quickly
- **Elements:**
  - Title "How Friends Works"
  - 3 feature cards with icons and brief text
  - Page indicators (2nd dot filled)
  - Continue button
- **Cards:**
  1. 👥 People - "Add friends, family, colleagues"
  2. ❤️ Preferences - "Remember what they like or dislike"
  3. 🔗 Connections - "Track how they're connected"
- **Copy:** Short, benefit-focused
- **Interaction:** Can swipe between screens

---

#### **Screen 3: Add First Person**

```
┌─────────────────────────────────────┐
│            Status Bar               │
├─────────────────────────────────────┤
│  [Skip]                        3/3  │ ← Skip option
│                                     │
│      Let's add someone!             │ ← Header
│                                     │
│                                     │
│          [ + ]                      │ ← Photo placeholder
│       Add photo                     │
│                                     │
│                                     │
│  Name                               │ ← Text input label
│  ┌───────────────────────────────┐ │
│  │ Enter name                    │ │ ← Text input
│  └───────────────────────────────┘ │
│                                     │
│  Relationship                       │ ← Dropdown label
│  ┌───────────────────────────────┐ │
│  │ Friend                      ▼ │ │ ← Dropdown
│  └───────────────────────────────┘ │
│                                     │
│                                     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │      Add Person               │ │ ← Primary CTA
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** User's first action - add someone
- **Elements:**
  - Skip link (top left)
  - Step indicator "3/3" (top right)
  - Photo upload button (centered, big)
  - Text input: Name (required)
  - Dropdown: Relationship type (Friend, Family, Colleague, etc.)
  - Primary button "Add Person"
- **Validation:**
  - Name required
  - Photo optional
  - Relationship defaults to "Friend"
- **After adding:** Navigate to main app (people list)

---

### **Phase 2: Main App (5 Screens)**

---

#### **Screen 4: People List (Home)**

```
┌─────────────────────────────────────┐
│            Status Bar               │
├─────────────────────────────────────┤
│  Friends               [⚙️]         │ ← Header + settings icon
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 🔍 Search people...           │ │ ← Search bar
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  [Photo]  Ola                 │ │ ← Person card 1
│  │           Friend              │ │
│  │  🍦 Ice cream  🇮🇹 Italy      │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  [Photo]  Simon               │ │ ← Person card 2
│  │           Family              │ │
│  │  ☕ Coffee  🎸 Guitar         │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  [O]      Mark                │ │ ← Person card 3 (no photo)
│  │           Colleague           │ │
│  │  🍕 Pizza  ⚽ Soccer          │ │
│  └───────────────────────────────┘ │
│                                     │
│                              [ + ]  │ ← FAB (floating action button)
│                                     │
├─────────────────────────────────────┤
│  [👥]     [📅]     [⚙️]            │ ← Bottom navigation
│  People  Timeline  Settings        │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** Main screen, view all people
- **Elements:**
  - Header "Friends" with settings icon
  - Search bar (always visible)
  - Scrollable list of person cards
  - Each card shows: Photo (or initial), Name, Relationship, 2-3 top preferences
  - FAB (Floating Action Button) bottom-right for "Add Person"
  - Bottom navigation: People (active), Timeline, Settings
- **Interactions:**
  - Tap card → Person detail
  - Tap FAB → Add person screen
  - Search → Filter results in real-time
  - Pull to refresh
- **Empty state:** "No people yet" with "Add your first person" button

---

#### **Screen 5: Person Detail**

```
┌─────────────────────────────────────┐
│  [←]  Ola                    [⋮]    │ ← Header: back, name, menu
├─────────────────────────────────────┤
│                                     │
│           [  Photo  ]               │ ← Large profile photo
│                                     │
│              Ola                    │ ← Name (large)
│             Friend                  │ ← Relationship type
│         Met: Jan 2015               │ ← Met date
│                                     │
├─────────────────────────────────────┤
│ [Overview] [Timeline] [Secrets]     │ ← Tabs
├─────────────────────────────────────┤
│                                     │
│  LIKES (8)                          │ ← Section header
│                                     │
│  🍦 Ice cream     ⭐⭐⭐⭐⭐       │ ← Preference with intensity
│  🇮🇹 Italy         ⭐⭐⭐⭐⭐       │
│  ☕ Coffee        ⭐⭐⭐           │
│  🎵 Jazz music    ⭐⭐⭐           │
│  [+ Add preference]                 │ ← Add button
│                                     │
│  DISLIKES (2)                       │
│  🍖 Red meat                        │
│  🌶️ Spicy food                     │
│  [+ Add preference]                 │
│                                     │
│  KNOWS (3)                          │ ← Connections section
│  👤 Simon (married)                 │
│  👤 Alex (friend)                   │
│  👤 Maria (colleague)               │
│                                     │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** View all details about a person
- **Elements:**
  - Header: Back button, name, overflow menu (edit, archive, delete)
  - Profile photo (large, centered)
  - Name, relationship type, met date
  - Tabs: Overview (active), Timeline, Secrets
  - Overview tab shows:
    - LIKES section with intensity stars
    - DISLIKES section
    - KNOWS section (connections to other people)
    - Add buttons for each section
- **Overflow menu:**
  - Edit person
  - Archive person
  - Delete person
- **Interactions:**
  - Tap preference chip → Edit intensity
  - Tap connection → Go to that person's detail
  - Tap "Add preference" → Go to add preference screen

---

#### **Screen 6: Add Preference**

```
┌─────────────────────────────────────┐
│  [←]  Add Preference for Ola   [✓]  │ ← Header: back, cancel, save
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 🔍 Search preferences...      │ │ ← Search bar
│  └───────────────────────────────┘ │
│                                     │
│  FOOD                               │ ← Category header
│  ┌────────────────────────────────┐│
│  │ 🍕 Italian  🍦 Ice cream       ││ ← Scrollable chips
│  │ ☕ Coffee   🍕 Pizza           ││
│  │ 🍝 Pasta    🍔 Burgers         ││
│  └────────────────────────────────┘│
│                                     │
│  ACTIVITIES                         │
│  ┌────────────────────────────────┐│
│  │ ⛰️ Hiking   🏊 Swimming        ││
│  │ 🚴 Cycling  🏃 Running         ││
│  └────────────────────────────────┘│
│                                     │
│  DIETARY                            │
│  ┌────────────────────────────────┐│
│  │ 🥕 Vegetarian  🌱 Vegan        ││
│  └────────────────────────────────┘│
│                                     │
│  [+ Create custom preference]       │ ← Custom entry option
│                                     │
├─────────────────────────────────────┤
│  Selected: Ice cream                │ ← Shows selection
│                                     │
│  ┌────────────┐  ┌────────────┐   │
│  │   LIKES    │  │  DISLIKES  │    │ ← Action buttons
│  └────────────┘  └────────────┘   │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** Add preference to person (from library)
- **Elements:**
  - Header with back, title, save (checkmark)
  - Search bar to filter preferences
  - Categories (Food, Activities, Dietary, etc.)
  - Each category has scrollable horizontal chips
  - Selected preference shown at bottom
  - Two buttons: LIKES or DISLIKES
  - Option to create custom preference
- **Interactions:**
  - Tap chip → Select it (highlight)
  - Tap LIKES → Add as positive preference
  - Tap DISLIKES → Add as negative preference
  - Search → Filter chips across all categories
- **After adding:** Return to person detail, show new preference

---

#### **Screen 7: Search**

```
┌─────────────────────────────────────┐
│  [←]  Search                        │ ← Header
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐ │
│  │ 🔍 Search by name...          │ │ ← Search input (focused)
│  └───────────────────────────────┘ │
│                                     │
│  RECENT SEARCHES                    │ ← Section
│  • Ola                              │
│  • Simon                            │
│  • Mark                             │
│                                     │
│  SUGGESTIONS                        │
│  • People who like ice cream        │
│  • Friends in tech                  │
│  • Family members                   │
│                                     │
│                                     │
└─────────────────────────────────────┘

After typing "Ol":

┌─────────────────────────────────────┐
│  [←]  Search                        │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐ │
│  │ 🔍 Ol [×]                     │ │ ← Search with clear
│  └───────────────────────────────┘ │
│                                     │
│  PEOPLE (1)                         │
│  ┌───────────────────────────────┐ │
│  │  [Photo]  Ola                 │ │ ← Matching person
│  │           Friend              │ │
│  │  🍦 Ice cream  🇮🇹 Italy      │ │
│  └───────────────────────────────┘ │
│                                     │
│  PREFERENCES (3)                    │
│  • Ice cream (Ola likes this)       │
│  • Olive oil (Mark uses this)       │
│  • Olives (Sarah dislikes)          │
│                                     │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** Find people by name, preference, etc.
- **Elements:**
  - Large search input (auto-focused)
  - Before typing: Recent searches, suggestions
  - After typing: Results grouped by type (People, Preferences)
  - Clear button (×) to reset search
- **Search covers:**
  - Person names
  - Nicknames
  - Preferences
  - Locations
  - Relationship types
- **Empty state:** "No results found for '{query}'"

---

### **Phase 3: Features (4 Screens)**

---

#### **Screen 8: Timeline**

```
┌─────────────────────────────────────┐
│            Status Bar               │
├─────────────────────────────────────┤
│  Timeline                    [📅]   │ ← Header + filter icon
│                                     │
│  ▼ November 2025                    │ ← Month header (collapsible)
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Nov 15                        │ │ ← Event card
│  │ Added Ola                     │ │
│  │ 👤 Friend                     │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Nov 10                        │ │
│  │ Ola now likes Ice cream       │ │
│  │ 🍦 ⭐⭐⭐⭐⭐                   │ │
│  └───────────────────────────────┘ │
│                                     │
│  ▼ October 2025                     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Oct 20                        │ │
│  │ Added Simon                   │ │
│  │ 👤 Friend                     │ │
│  └───────────────────────────────┘ │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  [👥]     [📅]     [⚙️]            │ ← Bottom nav (Timeline active)
│  People  Timeline  Settings        │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** Chronological view of all activities
- **Elements:**
  - Header "Timeline" with filter icon
  - Month headers (collapsible)
  - Event cards showing:
    - Date
    - Action (Added person, Added preference, etc.)
    - Icon and details
  - Bottom navigation (Timeline tab active)
- **Events tracked:**
  - Person added/edited/archived
  - Preference added/removed
  - Connection created/ended
  - Secret added
  - Photo changed
- **Filter options:**
  - All events
  - Person-specific
  - Type-specific (only preferences, only connections)
  - Date range

---

#### **Screen 9: Secrets - Locked**

```
┌─────────────────────────────────────┐
│  [←]  Ola's Secrets                 │ ← Header
├─────────────────────────────────────┤
│                                     │
│                                     │
│                                     │
│             🔒                      │ ← Lock icon (large)
│                                     │
│        Secrets are locked           │ ← Message
│                                     │
│    Enter your master password       │
│       to view this section          │
│                                     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Password                      │ │ ← Password input
│  │ ●●●●●●●●                     │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │        Unlock                 │ │ ← Unlock button
│  └───────────────────────────────┘ │
│                                     │
│  Forgot password?                   │ ← Link (shows warning)
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** Protect sensitive information
- **Elements:**
  - Large lock icon
  - Explanation text
  - Password input (masked)
  - Unlock button
  - "Forgot password" link (shows cannot recover warning)
- **Security:**
  - Password required every time
  - Auto-lock after 5 minutes of inactivity
  - No password recovery (by design)
- **First time:** User must set master password
- **After unlock:** Navigate to secrets list screen

---

#### **Screen 10: Secrets - Unlocked**

```
┌─────────────────────────────────────┐
│  [←]  Ola's Secrets    🔓  [Lock]   │ ← Header: unlocked, lock button
├─────────────────────────────────────┤
│                                     │
│  ⚠️  Auto-locks in 4:32             │ ← Timer warning
│                                     │
│  ┌───────────────────────────────┐ │
│  │  📝 Medical Information       │ │ ← Secret card 1
│  │  Blood type: O+               │ │
│  │  Allergic to penicillin       │ │
│  │  Created: Jan 15, 2024        │ │
│  │  [Edit] [Delete]              │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  💭 Private Note              │ │ ← Secret card 2
│  │  Ola dislikes being asked     │ │
│  │  about politics               │ │
│  │  Created: Feb 3, 2024         │ │
│  │  [Edit] [Delete]              │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  + Add Secret                 │ │ ← Add button
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** View and manage encrypted secrets
- **Elements:**
  - Header shows unlocked icon and "Lock" button
  - Timer showing auto-lock countdown
  - List of secret cards
  - Each card shows: Icon, title, preview of content, created date, actions
  - Add secret button at bottom
- **Interactions:**
  - Tap card → View/edit full secret
  - Manual lock → Tap "Lock" button
  - Auto-lock → After 5 minutes inactivity
  - Activity resets timer (scrolling, tapping)
- **Empty state:** "No secrets yet" with add button

---

#### **Screen 11: Settings**

```
┌─────────────────────────────────────┐
│            Status Bar               │
├─────────────────────────────────────┤
│  Settings                           │ ← Header
│                                     │
│  ACCOUNT                            │ ← Section
│  • Your name: Me                    │
│  • Email: (not set)                 │
│                                     │
│  SECURITY                           │
│  • Master password                  │
│    Change password                  │
│  • Auto-lock secrets                │
│    After 5 minutes                  │
│                                     │
│  DATA                               │
│  • Export data (JSON)               │
│  • Import data                      │
│  • Backup                           │
│                                     │
│  PREMIUM                            │
│  • Upgrade to Premium               │
│    Unlock AI features, sync         │
│                                     │
│  APP                                │
│  • Theme: Light                     │
│  • Language: English                │
│  • Archived people (5)              │
│                                     │
│  ABOUT                              │
│  • Version: 1.0.0                   │
│  • Privacy policy                   │
│  • Terms of service                 │
│                                     │
├─────────────────────────────────────┤
│  [👥]     [📅]     [⚙️]            │ ← Bottom nav (Settings active)
│  People  Timeline  Settings        │
└─────────────────────────────────────┘
```

**Description:**
- **Purpose:** App configuration and account management
- **Sections:**
  - **Account:** Name, email (for future sync)
  - **Security:** Password management, auto-lock settings
  - **Data:** Export, import, backup options
  - **Premium:** Upgrade CTA (links to subscription)
  - **App:** Theme, language, archived people
  - **About:** Version, legal links
- **Key settings:**
  - Change master password
  - Export data (JSON download)
  - View archived people
  - Upgrade to Premium
- **Archived people:**
  - Shows count
  - Tap → View list of archived people
  - Can unarchive from there

---

### **Phase 4: States & Components**

---

#### **Empty States**

**No People Yet:**
```
┌─────────────────────────────────────┐
│  Friends                            │
├─────────────────────────────────────┤
│                                     │
│                                     │
│             👥                      │ ← Large icon
│                                     │
│      No people yet                  │ ← Message
│                                     │
│  Start by adding someone you know   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Add Your First Person       │ │ ← CTA button
│  └───────────────────────────────┘ │
│                                     │
│      or                             │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Import from Contacts        │ │ ← Secondary action
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**No Timeline Events:**
```
│             📅                      │
│                                     │
│    No events yet                    │
│                                     │
│  Start adding people and            │
│  preferences to see your timeline   │
```

**No Secrets:**
```
│             🔒                      │
│                                     │
│    No secrets yet                   │
│                                     │
│  Add private notes that are         │
│  password-protected                 │
```

**No Search Results:**
```
│             🔍                      │
│                                     │
│  No results for "xyz"               │
│                                     │
│  Try a different search term        │
```

---

#### **Loading States**

**Skeleton Screen (People List):**
```
┌─────────────────────────────────────┐
│  Friends                            │
│                                     │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │ ← Skeleton search
│                                     │
│  ┌───────────────────────────────┐ │
│  │  ⚪  ▓▓▓▓▓▓▓▓▓               │ │ ← Skeleton cards
│  │      ▓▓▓▓▓                   │ │
│  │  ▓▓ ▓▓▓  ▓▓ ▓▓▓             │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │  ⚪  ▓▓▓▓▓▓▓▓▓               │ │
│  │      ▓▓▓▓▓                   │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Spinner (Loading):**
```
│                                     │
│            ⭕                       │ ← Spinner
│                                     │
│         Loading...                  │
│                                     │
```

---

#### **Error States**

**Generic Error:**
```
│             ⚠️                      │
│                                     │
│    Something went wrong             │
│                                     │
│  We couldn't complete that action   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │        Try Again              │ │
│  └───────────────────────────────┘ │
```

**Network Error:**
```
│             📶                      │
│                                     │
│    No internet connection           │
│                                     │
│  Check your connection and try      │
│  again                              │
```

---

## 🎨 Component Library

### **1. Person Card**
- Photo (circle, 48px) or initial
- Name (16px, bold)
- Relationship type (12px, gray)
- 2-3 preference chips below
- Tap to view details

### **2. Preference Chip**
- Icon + label
- Small (24px height)
- Rounded corners (12px)
- Background: light purple
- Tap to edit/remove

### **3. Bottom Navigation**
- 3 tabs: People, Timeline, Settings
- Icons + labels
- Active tab: purple, bold
- Inactive: gray

### **4. Floating Action Button (FAB)**
- Circle (56px diameter)
- Purple background
- Plus icon
- Fixed bottom-right
- Elevation/shadow

### **5. Search Bar**
- Full width
- Search icon left
- Placeholder text
- Clear button right (when typing)
- 48px height

### **6. Section Header**
- Text (14px, uppercase, gray)
- Left-aligned
- 16px top margin
- 8px bottom margin

---

## 📏 Design System

### **Colors**

```
Primary:
- Purple: #6200EE (buttons, active states)
- Purple Light: #E8DEF8 (backgrounds)

Secondary:
- Teal: #03DAC6 (accents)

Surfaces:
- White: #FFFFFF (background)
- Light Gray: #F5F5F5 (surface)
- Gray: #E0E0E0 (borders)

Text:
- Dark: #1C1B1F (primary text)
- Medium: #49454F (secondary text)
- Light: #79747E (tertiary text)

Semantic:
- Error: #B00020 (red)
- Success: #00C853 (green)
- Warning: #FFB300 (orange)
```

### **Typography**

```
Headline: Roboto Bold, 24px, line-height 32px
Title: Roboto Medium, 20px, line-height 28px
Body: Roboto Regular, 16px, line-height 24px
Caption: Roboto Regular, 12px, line-height 16px
```

### **Spacing**

```
Use multiples of 8:
4px  (tiny gap)
8px  (small gap)
16px (standard gap)
24px (medium gap)
32px (large gap)
```

### **Corner Radius**

```
4px  (subtle, like chips)
8px  (cards)
12px (buttons)
24px (rounded elements)
Circle (profile photos, FAB)
```

---

## ✅ Figma Project Setup Checklist

- [ ] Create Figma account
- [ ] Create "Friends App - Mobile" file
- [ ] Duplicate Material Design 3 kit
- [ ] Set up pages (Wireframes, High-Fidelity, Components, Flows, System)
- [ ] Create iPhone 14 Pro frame (393 × 852)
- [ ] Design 12 wireframes (this guide)
- [ ] Create component library (person card, chip, FAB, etc.)
- [ ] Define design system (colors, typography, spacing)
- [ ] Create high-fidelity screens
- [ ] Link screens for prototype
- [ ] Test prototype with friends
- [ ] Export specs for development

---

## 🔄 Next Steps After Figma

1. **Share designs** - Get feedback from friends/family
2. **Iterate** - Fix issues before coding
3. **Export assets** - Icons, images at @2x and @3x
4. **Document components** - Write specs for developer (you!)
5. **Start coding!** - Use MOBILE_FIRST_IMPLEMENTATION.md guide

---

**Need help with any specific screen? Let me know!** 🎨
