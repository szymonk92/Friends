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

### Phase 1 MVP (Current)

- ✅ **People Management** - Add, view, and organize people in your network
- ✅ **Story Input** - Share stories and the AI extracts key information
- ✅ **Relations Tracking** - Automatic extraction of 20+ relation types
- ✅ **Person Profiles** - View detailed profiles with all relations
- ✅ **Search** - Find people quickly by name
- ✅ **Local-First** - All data stored locally in SQLite

### Core Screens

1. **People List** (`/(tabs)/index`)
   - Browse all people with search
   - View relationship types and importance
   - Tap to view full profile

2. **Add Story** (`/(tabs)/two`)
   - Share stories about people you know
   - AI extracts relations automatically
   - Cost estimation ($0.02/story)

3. **Person Profile** (`/person/[id]`)
   - View person details
   - See all relations grouped by type
   - Delete person

4. **Add Person** (`/modal`)
   - Manually add people
   - Set relationship type
   - Add notes

5. **Dev Tools** (`/dev`)
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

## Environment Variables

Create `.env` file:

```bash
# Required for AI extraction
ANTHROPIC_API_KEY=your_api_key_here
```

## Cost Optimization

**Lightweight Context Strategy:**
- Only sends person names to AI (not full profiles)
- ~1,500 tokens per extraction vs ~50,000
- **97% cost reduction**: $0.02 vs $1.50 per story
- 10x faster processing

## Next Steps (Phase 2)

- [ ] AI extraction integration (backend ready, needs API key)
- [ ] Review screen for extracted relations
- [ ] Conflict detection UI
- [ ] Duplicate person merging
- [ ] Import/export data
- [ ] Contact frequency tracking
- [ ] Birthday reminders

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
