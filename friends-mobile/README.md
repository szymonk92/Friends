# Friends Mobile App

AI-powered relationship tracker - Remember everything about everyone you care about.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run ios        # iOS (macOS only)
npm run android    # Android
npm run web        # Web browser
```

## Features

### Phase 1 MVP (Complete ✅)

- ✅ **People Management** - Add, view, edit, and delete people in your network
- ✅ **Manual Relation Management** - Add, edit, and delete relations without AI
- ✅ **AI Story Extraction** - Share stories and Claude automatically extracts key information
- ✅ **Relations Tracking** - Automatic extraction of 20+ relation types (LIKES, IS, FEARS, etc.)
- ✅ **Person Profiles** - View detailed profiles with all relations grouped by type
- ✅ **Search** - Find people quickly by name
- ✅ **API Key Management** - Secure storage of your Anthropic API key
- ✅ **Auto-Accept Logic** - High-confidence relations saved automatically
- ✅ **Local-First** - All data stored locally in SQLite

### Core Screens

1. **People List** (`/(tabs)/index`)
   - Browse all people with search
   - View relationship types and importance
   - Tap to view full profile

2. **Add Story** (`/(tabs)/two`)
   - Share stories about people you know
   - AI extracts relations automatically (with your API key)
   - Cost estimation ($0.02/story)
   - Auto-creates people mentioned in stories
   - Auto-saves high-confidence relations

3. **Person Profile** (`/person/[id]`)
   - View person details
   - See all relations grouped by type
   - Edit/delete person
   - Edit/delete individual relations
   - Add new relations

4. **Add Person** (`/modal`)
   - Manually add people
   - Set relationship type
   - Add notes

5. **Edit Person** (`/person/edit`)
   - Update person details
   - Change relationship type
   - Edit notes

6. **Add Relation** (`/person/add-relation`)
   - Manually add relations to a person
   - 10 common relation types
   - Set intensity and category

7. **Edit Relation** (`/person/edit-relation`)
   - Update existing relation
   - Change type, intensity, category

8. **Dev Tools** (`/dev`)
   - Seed sample data for testing
   - Clear all data
   - Quick navigation

## Database Schema

- **12 tables** with complete relationships
- **20 relation types**: LIKES, DISLIKES, IS, BELIEVES, FEARS, CARES_FOR, etc.
- **Person classification**: primary, mentioned, placeholder
- **Importance tracking**: unknown, peripheral, important, very_important
- **Temporal tracking**: validFrom, validTo, status (current/past/future)

## Tech Stack

- **Platform**: Expo + React Native 0.81
- **Language**: TypeScript 5.9
- **UI**: React Native Paper 5 (Material Design 3)
- **Navigation**: Expo Router (file-based)
- **Database**: SQLite + Drizzle ORM
- **State**: TanStack Query + Zustand
- **AI**: Anthropic Claude 3.5 Sonnet
- **Forms**: React Hook Form + Zod validation

## Project Structure

```
friends-mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Main tabs (People, Add Story)
│   ├── person/[id].tsx    # Person profile
│   ├── modal.tsx          # Add Person form
│   └── dev.tsx            # Dev tools
├── lib/
│   ├── db/                # Database (schema, migrations, seed)
│   ├── ai/                # AI extraction service
│   ├── validation/        # Zod schemas
│   └── utils/             # Formatting helpers
├── hooks/                 # Custom React hooks
│   ├── usePeople.ts
│   ├── useStories.ts
│   └── useRelations.ts
└── components/            # Reusable components
```

## Development

### Seed Sample Data

Visit `/dev` in the app or run:

```typescript
import { seedSampleData } from '@/lib/db/seed';
await seedSampleData();
```

Creates:

- 3 people (Emma, Mike, Sarah)
- 8 relations (likes, skills, fears)
- 1 story

### Database Migrations

Migrations run automatically on app start. To generate new migrations:

```bash
npm run db:generate
```

### Type Checking

```bash
npx tsc --noEmit
```

### Linting

```bash
npm run lint
```

## API Key Setup

**Option 1: In-App (Recommended)**

1. Open the app and go to "Add Story" tab
2. Tap "Set API Key" button
3. Enter your Anthropic API key
4. Your key is securely stored locally

**Option 2: Environment Variables**
Create `.env` file:

```bash
# Optional - can also set in-app
ANTHROPIC_API_KEY=your_api_key_here
```

Get your API key from: https://console.anthropic.com

## Cost Optimization

**Lightweight Context Strategy:**

- Only sends person names to AI (not full profiles)
- ~1,500 tokens per extraction vs ~50,000
- **97% cost reduction**: $0.02 vs $1.50 per story
- 10x faster processing

## How to Use

1. **Seed Sample Data** (recommended for first time)
   - Navigate to `/dev` screen
   - Tap "Seed Sample Data"
   - Explore Emma, Mike, and Sarah's profiles

2. **Set Your API Key**
   - Go to "Add Story" tab
   - Tap "Set API Key"
   - Enter your Anthropic API key from https://console.anthropic.com

3. **Add a Story**
   - Write about someone you know
   - Example: "Had lunch with Alex. He's a software engineer who loves hiking and hates spicy food."
   - AI will automatically extract:
     - Person: Alex (created automatically)
     - Relations: HAS_SKILL "software engineering", LIKES "hiking", DISLIKES "spicy food"

4. **View Results**
   - Check "People" tab to see Alex
   - Tap Alex's profile to see extracted relations
   - Relations are grouped by type (LIKES, DISLIKES, HAS_SKILL, etc.)

## Future Enhancements (Phase 2+)

- [ ] Review screen for low-confidence relations (manual approval)
- [ ] Conflict detection UI (contradictions between stories)
- [ ] Duplicate person merging (intelligent de-duplication)
- [ ] Import/export data (backup & restore)
- [ ] Contact frequency tracking (relationship health)
- [ ] Birthday reminders
- [ ] Voice note support

## Troubleshooting

**Build errors:**

- Run `npm install` to ensure all dependencies are installed
- Clear cache: `npx expo start -c`

**Database issues:**

- Use `/dev` screen to clear and reseed data
- Delete `friends.db` from app storage and restart

**TypeScript errors:**

- Run `npx tsc --noEmit` to check for issues
- Most warnings are from Expo templates and can be ignored

## License

Private - All Rights Reserved
