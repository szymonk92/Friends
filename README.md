# Friends - AI-Powered Social Memory Manager

> Never forget what matters. Remember the stories, preferences, and connections that make your relationships special.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB)](https://reactjs.org/)

## 🎯 What is Friends?

**Friends** is an intelligent relationship management application that helps you capture and remember meaningful details about the people in your life. By writing natural stories about your experiences, our AI automatically extracts and organizes preferences, shared memories, and connections—so you never forget that your friend Ola loves ice cream or that you've visited Italy together multiple times.

### The Problem

We meet amazing people, share incredible experiences, but over time we forget the details:
- What do they like or dislike?
- What have we done together?
- Who knows whom in my social circle?
- What should I cook when they visit?
- How should I arrange seating at my dinner party?

### The Solution

Friends uses AI to transform your stories into structured, searchable relationship data. Simply write:

> "I met Ola 10 years ago, we have been to Italy together many times, we always eat ice cream"

And Friends automatically understands:
- **Person:** Ola
- **Timeline:** Met 10 years ago
- **Shared Experiences:** Multiple trips to Italy
- **Preferences:** Loves ice cream
- **Relationship Strength:** High (long-term, multiple shared experiences)

---

## ✨ Key Features

### Phase 1: MVP (Current)
- 👥 **People Management** - Organize contacts with rich profiles
- 📖 **Story Capture** - Write natural language memories
- 🤖 **AI Entity Extraction** - Automatic preference and event detection
- 🏷️ **Smart Tagging** - AI-suggested tags and categories
- 📊 **Insights Dashboard** - Visual timelines and preference clouds
- 🔍 **Smart Search** - Find people by preferences, experiences, or connections

### Phase 2: Future Features
- 🍽️ **Meal Planning** - Get menu suggestions based on guest preferences
- 🪑 **Seating Optimizer** - AI-powered seating arrangements for events
- 🎁 **Gift Recommendations** - Never run out of gift ideas
- 📱 **Mobile App** - Expo React Native app with offline support

---

## 🚀 Quick Start

### Architecture: Local-First (Privacy-First!)

**Your data stays on your device.** No cloud storage, no server-side database. Optional AI proxy for API key protection only.

### Prerequisites
- Node.js 20+
- **No database needed!** Uses local RDF/Turtle files or SQLite

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/friends.git
cd friends

# Install dependencies
npm install

# Start desktop app
npm run dev

# Your data will be stored locally at:
# ~/Documents/Friends/graphs/main.ttl
```

### Optional: AI Proxy Setup
```bash
# Only if you want to use OpenAI for entity extraction
cd server
cp .env.example .env
# Add your OpenAI API key
npm run proxy
```

---

## 🏗️ Architecture: Local-First Design

### Technology Stack

#### Desktop App
- **Framework:** Electron (or Tauri)
- **UI:** React 18 + TypeScript + Tailwind CSS
- **Data Layer:** RDF/Turtle (N3.js) ⭐ **Recommended for <10k triples**
- **Alternative:** SQLite (better-sqlite3)
- **Visualization:** D3.js, React Flow

#### Optional AI Proxy (No Data Storage)
- **Runtime:** Node.js + Express
- **AI:** OpenAI GPT-4 / Anthropic Claude
- **Alternative:** Local models (Ollama + Llama 3)

#### Future: Mobile
- **Framework:** Expo (React Native)
- **Data:** expo-sqlite or RDF library
- **Sync:** Encrypted file sync

### Data Flow (Local-First)

```
User writes story → (Optional) AI Proxy extracts entities →
Data saved to local RDF file (~/Documents/Friends/main.ttl) →
User sees insights instantly (no network needed!)
```

### Why Local-First?

- 🔒 **Privacy:** Your data never leaves your device
- ⚡ **Speed:** No network latency, instant queries
- 💰 **Cost:** No server hosting fees
- 🌐 **Offline:** Works without internet
- 📦 **Simple:** No database to install or configure

---

## 📁 Project Structure

```
friends/
├── apps/
│   ├── web/                 # React web application
│   └── mobile/              # Expo app (Phase 4)
├── packages/
│   ├── shared/              # Shared business logic
│   ├── ui/                  # Shared UI components
│   └── api-client/          # API client library
├── server/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database models
│   │   ├── ai/              # AI processing pipeline
│   │   └── utils/           # Utilities
│   └── tests/
├── docs/                    # Documentation
│   ├── PRD.md              # Product Requirements Document
│   └── TASKS.md            # Implementation tasks
└── scripts/                # Build and deployment scripts
```

---

## 🎨 Example Usage

### Adding a Story

```typescript
// User writes in the app
const story = `
  Last weekend, I went hiking with Mark and Sarah.
  Mark brought his famous chocolate chip cookies (which everyone loved).
  Sarah mentioned she's vegetarian now and loved the trail near the lake.
`;

// AI automatically extracts:
{
  people: ['Mark', 'Sarah'],
  preferences: [
    { person: 'Mark', type: 'likes', item: 'baking', category: 'activity' },
    { person: 'Sarah', type: 'diet', item: 'vegetarian', category: 'food' },
    { person: 'Sarah', type: 'likes', item: 'hiking', category: 'activity' }
  ],
  events: [
    { type: 'shared_experience', activity: 'hiking', people: ['Mark', 'Sarah', 'User'] }
  ],
  tags: ['outdoors', 'food', 'friends']
}
```

### Meal Planning (Phase 2)

```typescript
// User plans dinner
const guests = ['Mark', 'Sarah', 'Ola'];

// AI suggests
{
  menu: {
    main: 'Vegetarian pasta (Sarah is vegetarian)',
    dessert: 'Ice cream (Ola loves it) + Mark's cookies',
    avoid: 'Nuts (Sarah's allergy)'
  },
  compatibility: 95, // All guests have overlapping preferences
  warnings: ['Sarah: vegetarian', 'Sarah: nut allergy']
}
```

---

## 🧠 AI Models & Approach

### LLM Selection
- **Primary:** OpenAI GPT-4 (high accuracy)
- **Alternative:** Anthropic Claude 3
- **Future:** Fine-tuned open-source models (cost optimization)

### Processing Pipeline
1. **Input:** Natural language story
2. **Preprocessing:** Text cleaning, spell check
3. **LLM Analysis:** Entity extraction via structured prompts
4. **Confidence Scoring:** 0-1 scale
5. **User Validation:** Confirm low-confidence extractions
6. **Storage:** PostgreSQL + Neo4j + Vector DB

### Prompt Strategy
- Structured JSON outputs using function calling
- Few-shot examples for consistency
- Confidence scoring for every extraction
- Fallback to simpler extraction on API failures

---

## 📊 Data Models

### Core Entities

```typescript
interface Person {
  id: string;
  name: string;
  relationship: 'friend' | 'family' | 'colleague';
  metDate?: Date;
  preferences: Preference[];
  connections: Connection[];
}

interface Preference {
  category: 'food' | 'activity' | 'travel';
  item: string;
  type: 'likes' | 'dislikes';
  confidence: number;
  source: Story;
}

interface Story {
  id: string;
  content: string;
  people: Person[];
  date: Date;
  extractedData: ExtractedData;
}
```

---

## 🎯 Roadmap

### Phase 1: MVP (Q1 2025) ✅ Planning
- [x] PRD & Technical Design
- [ ] Authentication system
- [ ] People & Stories CRUD
- [ ] AI integration (OpenAI)
- [ ] Basic visualizations
- [ ] Beta launch (100 users)

### Phase 2: Intelligence (Q2 2025)
- [ ] Network graph visualization
- [ ] Advanced AI insights
- [ ] Performance optimization
- [ ] 1,000 active users

### Phase 3: Social Features (Q3 2025)
- [ ] Meal planning assistant
- [ ] Seating arrangement tool
- [ ] Gift recommendations
- [ ] Monetization launch

### Phase 4: Mobile (Q4 2025)
- [ ] Expo React Native app
- [ ] Offline mode
- [ ] Push notifications
- [ ] 10,000+ users

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📚 Documentation

- [Product Requirements Document (PRD)](PRD.md) - Detailed product specifications
- [Implementation Tasks](TASKS.md) - Development task breakdown
- [Local-First Architecture](docs/LOCAL_FIRST_ARCHITECTURE.md) - Privacy-first design ⭐ **NEW**
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

---

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- The React and TypeScript communities
- All our beta testers and early adopters

---

## 📬 Contact

- **Issues:** [GitHub Issues](https://github.com/yourusername/friends/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/friends/discussions)

---

**Built with ❤️ for people who care about meaningful relationships**