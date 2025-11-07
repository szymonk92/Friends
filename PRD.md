# Product Requirements Document (PRD)
## Friends - AI-Powered Social Memory Manager

**Version:** 1.0
**Date:** November 2025
**Status:** Planning Phase

---

## 1. Executive Summary

**Friends** is an AI-powered social memory management application that helps users capture, organize, and extract meaningful insights from their personal relationships. By processing natural language stories, the application automatically identifies preferences, shared experiences, and relationship networks, enabling users to maintain deeper, more thoughtful connections.

### Vision
To create the most intuitive and intelligent platform for managing personal relationships, evolving from a web-based memory keeper to a comprehensive social intelligence tool that helps with meal planning, event organization, and relationship nurturing.

---

## 2. Problem Statement

People struggle to remember important details about their friends and family:
- What do they like or dislike?
- What experiences have we shared?
- Who knows whom in my network?
- What are their preferences for food, activities, and gifts?
- How can I plan events that bring the right people together?

Traditional contact management tools store basic information but fail to capture the rich context of relationships and shared experiences.

---

## 3. Goals & Objectives

### Primary Goals
1. Enable users to easily capture relationship memories through natural language
2. Automatically extract meaningful data (preferences, experiences, connections) using AI
3. Provide intelligent insights for relationship management
4. Support future use cases: meal planning, seating arrangements, gift ideas

### Success Metrics
- User story capture rate (stories/week per active user)
- AI extraction accuracy (>90% for preferences, people, places)
- User retention (30-day, 90-day)
- Time saved in event planning (measured through user surveys)

---

## 4. User Personas

### Primary Persona: "The Thoughtful Host"
- **Name:** Sarah, 32
- **Role:** Marketing Manager
- **Needs:** Plans frequent dinner parties, wants to remember dietary restrictions, relationship dynamics, and preferences
- **Pain Points:** Forgets who's vegetarian, who knows whom, what topics to avoid

### Secondary Persona: "The Busy Professional"
- **Name:** Michael, 45
- **Role:** Sales Director
- **Needs:** Maintains large professional network, wants to remember personal details for meaningful conversations
- **Pain Points:** Feels disconnected, forgets important details about clients and colleagues

---

## 5. Core Features

### Phase 1: MVP (Web Application)

#### 5.1 People Management
**Description:** Core entity management for contacts/friends

**User Stories:**
- As a user, I can add a person with basic info (name, photo, relationship type)
- As a user, I can view a list of all people in my network
- As a user, I can search and filter people by various criteria

**Acceptance Criteria:**
- Create, read, update, delete (CRUD) operations for people
- Profile page for each person showing all related data
- Search supports fuzzy matching

#### 5.2 Story Capture
**Description:** Natural language input for capturing memories and experiences

**User Stories:**
- As a user, I can write a story about an experience with one or more people
- As a user, I can see suggested tags as I write
- As a user, I can edit or delete stories

**Example Story:**
```
"I met Ola 10 years ago, we have been to Italy together many times,
we always eat ice cream"
```

**Acceptance Criteria:**
- Rich text input with auto-save
- Support for multiple people per story
- Date/timestamp capture
- Photo/image attachment support

#### 5.3 AI-Powered Entity Extraction
**Description:** Automatic extraction of meaningful data from stories

**Extracted Entities:**
1. **People:** Names and relationships
2. **Preferences (LIKES/DISLIKES):**
   - Foods (ice cream, pizza, sushi)
   - Activities (hiking, movies, concerts)
   - Places (countries, cities, restaurants)
3. **Timeline Events:**
   - When people met
   - Shared experiences
   - Locations visited together
4. **Relationships:**
   - Who knows whom
   - Nature of relationships
5. **Contextual Tags:**
   - Themes (travel, food, work)
   - Sentiment

**Example Output from Test Story:**
```
Person: Ola
- Met: 10 years ago
- Shared Experiences: Italy (multiple visits)
- Likes: Ice cream
- Tags: travel, food, long-term-friendship
- Relationship Strength: High (10 years, multiple trips)
```

**Acceptance Criteria:**
- Minimum 90% accuracy on clear statements
- User can confirm/reject AI suggestions
- Incremental learning from user corrections

#### 5.4 Preferences & Interests Database
**Description:** Structured storage of extracted preferences

**Data Model:**
```
Person -> LIKES -> [
  { category: "food", item: "ice cream", confidence: 0.95 },
  { category: "travel", item: "Italy", confidence: 1.0 }
]

Person -> DISLIKES -> [...]
Person -> KNOWS -> [Person2, Person3]
Person -> EXPERIENCES -> [Story1, Story2]
```

**Acceptance Criteria:**
- Graph-based data structure
- Visual representation of preferences
- Filtering by category

#### 5.5 Intelligent Insights Dashboard
**Description:** AI-generated insights about relationships

**Features:**
- Relationship timeline visualization
- Preference clouds for each person
- Shared experience mapping
- Network graph (who knows whom)

---

### Phase 2: Advanced Features (Future)

#### 5.6 Meal Planning Assistant
**User Stories:**
- As a user, I can input a list of guests and get meal suggestions based on preferences
- As a user, I can see dietary restrictions and allergies for all guests
- As a user, I can generate shopping lists

**Features:**
- Diet compatibility checker
- Recipe suggestions based on group preferences
- Allergy and restriction warnings

#### 5.7 Seating Arrangement Optimizer
**User Stories:**
- As a user, I can get optimal seating arrangements based on relationships
- As a user, I can see why certain people are seated together

**Features:**
- Relationship strength algorithm
- Conversation compatibility scoring
- Manual override capability

#### 5.8 Gift Recommendation Engine
**Features:**
- Suggest gifts based on preferences and past successes
- Track gift history to avoid repetition
- Budget-aware recommendations

---

## 6. Technical Architecture

### 6.1 Technology Stack

#### Frontend (Phase 1 - Web)
- **Framework:** React 18+ with TypeScript
- **State Management:** Zustand or Redux Toolkit
- **Routing:** React Router v6
- **UI Components:**
  - Tailwind CSS for styling
  - Shadcn/ui or Radix UI for component library
  - Framer Motion for animations
- **Forms:** React Hook Form + Zod validation
- **Data Visualization:**
  - D3.js for custom visualizations
  - Recharts for standard charts
  - React Flow for network graphs

#### Frontend (Phase 2 - Mobile)
- **Framework:** Expo (React Native)
- **Shared Logic:** Monorepo structure with shared business logic
- **Native Features:** Camera, contacts integration, notifications

#### Backend
- **Runtime:** Node.js 20+ with Express or Fastify
- **Language:** TypeScript
- **API:** RESTful API (Phase 1), GraphQL (Phase 2)
- **Authentication:**
  - JWT tokens
  - OAuth2 (Google, Apple Sign-In)
  - Passport.js

#### Database
- **Primary:** PostgreSQL 15+ (structured data)
  - Users, people, stories, preferences
- **Graph Database:** Neo4j (relationships, network analysis)
  - "Who knows whom" network
  - Relationship strength calculations
- **Vector Database:** Pinecone or Weaviate (semantic search)
  - Story embeddings for similar memory retrieval
  - Preference matching

#### AI/ML Stack
- **LLM Integration:**
  - Primary: OpenAI GPT-4 or Anthropic Claude
  - Fallback: Open-source models (Llama 3, Mistral)
- **NLP Tasks:**
  - Named Entity Recognition (NER)
  - Relationship extraction
  - Sentiment analysis
- **Embeddings:** OpenAI text-embedding-3 or open-source alternatives
- **Prompt Engineering:** LangChain or LlamaIndex for prompt management

#### Infrastructure
- **Hosting:**
  - Frontend: Vercel or Netlify
  - Backend: Railway, Render, or AWS ECS
- **Storage:**
  - S3 or Cloudflare R2 for images
  - CDN for asset delivery
- **Monitoring:**
  - Sentry for error tracking
  - PostHog or Mixpanel for analytics
  - OpenTelemetry for observability

### 6.2 Data Models

#### Core Entities

```typescript
// User
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  settings: UserSettings;
}

// Person (Contact/Friend)
interface Person {
  id: string;
  userId: string;
  name: string;
  nickname?: string;
  photoUrl?: string;
  relationship: RelationshipType;
  metDate?: Date;
  birthday?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Story
interface Story {
  id: string;
  userId: string;
  content: string;
  people: string[]; // Person IDs
  date?: Date;
  location?: string;
  images?: string[];
  extractedData: ExtractedData;
  createdAt: Date;
  updatedAt: Date;
}

// Extracted Data
interface ExtractedData {
  preferences: Preference[];
  events: TimelineEvent[];
  relationships: Connection[];
  tags: Tag[];
  sentiment?: number;
}

// Preference
interface Preference {
  personId: string;
  category: PreferenceCategory;
  item: string;
  type: 'likes' | 'dislikes';
  confidence: number;
  sourceStoryId: string;
  verifiedByUser: boolean;
}

// Timeline Event
interface TimelineEvent {
  id: string;
  type: 'first_met' | 'shared_experience' | 'milestone';
  date: Date;
  description: string;
  people: string[];
  location?: string;
  storyId: string;
}

// Connection (Graph Edge)
interface Connection {
  person1Id: string;
  person2Id: string;
  relationshipType: string;
  strength: number; // 0-1
  sharedExperiences: string[];
  discoveredAt: Date;
}
```

#### Enum Types

```typescript
enum RelationshipType {
  FAMILY = 'family',
  FRIEND = 'friend',
  COLLEAGUE = 'colleague',
  ACQUAINTANCE = 'acquaintance',
  PARTNER = 'partner'
}

enum PreferenceCategory {
  FOOD = 'food',
  ACTIVITY = 'activity',
  TRAVEL = 'travel',
  ENTERTAINMENT = 'entertainment',
  OTHER = 'other'
}
```

### 6.3 AI Processing Pipeline

```
User Input (Story)
    ↓
Text Preprocessing (sanitization, spell check)
    ↓
LLM Analysis (GPT-4/Claude)
    - Entity extraction (people, places, foods)
    - Relationship identification
    - Sentiment analysis
    - Tag generation
    ↓
Structured Data Extraction
    ↓
Confidence Scoring
    ↓
User Confirmation (if confidence < 0.8)
    ↓
Database Storage (PostgreSQL + Neo4j)
    ↓
Vector Embedding Generation
    ↓
Vector Store (Pinecone/Weaviate)
```

### 6.4 API Design

#### Key Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/people
POST   /api/people
GET    /api/people/:id
PUT    /api/people/:id
DELETE /api/people/:id

GET    /api/stories
POST   /api/stories
GET    /api/stories/:id
PUT    /api/stories/:id
DELETE /api/stories/:id

POST   /api/stories/analyze          # AI processing
GET    /api/people/:id/preferences
GET    /api/people/:id/timeline
GET    /api/people/:id/connections

GET    /api/insights/network          # Network graph data
GET    /api/insights/preferences      # Preference analytics
POST   /api/insights/meal-plan        # Meal planning (Phase 2)
POST   /api/insights/seating          # Seating arrangement (Phase 2)
```

---

## 7. User Interface & Visualizations

### 7.1 Core Views

#### Dashboard
- Recent stories feed
- Quick add story button
- Insights widget (interesting facts, anniversaries)
- Network visualization snapshot

#### People List
- Grid/list view toggle
- Search and filter bar
- Sort by: name, last interaction, relationship type
- Quick preview cards

#### Person Detail Page
- Profile header (photo, name, relationship)
- **Tabs:**
  1. **Overview:** Key facts, preferences summary, relationship strength
  2. **Preferences:** Categorized likes/dislikes with confidence indicators
  3. **Timeline:** Chronological view of shared experiences
  4. **Stories:** All stories mentioning this person
  5. **Network:** Visual graph of connections through this person

#### Story Creator
- Rich text editor
- People tagging (@mention style)
- Date picker
- Image upload
- AI suggestions panel (real-time as you type)

#### Network Visualization
- Interactive graph (D3.js or React Flow)
- Node size = relationship strength
- Edge thickness = shared experiences count
- Color coding by relationship type
- Zoom, pan, search capabilities

### 7.2 Visualization Components

#### Preference Cloud
- Word cloud style
- Size = frequency/confidence
- Color = category
- Interactive (click to filter stories)

#### Timeline View
- Horizontal/vertical timeline
- Events as interactive nodes
- Filter by person, type, date range
- Zoom to date ranges

#### Relationship Strength Meter
- Visual indicator (circle fill, progress bar)
- Metrics: time known, experiences shared, interaction frequency
- Trend over time graph

#### Meal Planning Interface (Phase 2)
- Guest list with dietary summaries
- Compatibility matrix heatmap
- Menu builder with preference matching
- Shopping list generator

#### Seating Arrangement Tool (Phase 2)
- Drag-and-drop table layout
- Auto-suggest mode with AI recommendations
- Compatibility scores displayed
- Reason explanations on hover

---

## 8. AI Model Selection & Implementation

### 8.1 LLM Options

#### Option 1: OpenAI GPT-4 (Recommended for MVP)
**Pros:**
- Excellent entity extraction accuracy
- Strong reasoning for relationship inference
- Good API reliability and documentation
- Function calling for structured outputs

**Cons:**
- Higher cost per request
- API dependency

**Use Cases:**
- Story analysis
- Entity extraction
- Tag generation

#### Option 2: Anthropic Claude 3 (Alternative)
**Pros:**
- Strong analytical capabilities
- Longer context windows
- Competitive pricing

**Cons:**
- Slightly different API patterns

#### Option 3: Open Source (Llama 3.1, Mistral)
**Pros:**
- Lower operational cost
- Data privacy (self-hosted)
- No API limits

**Cons:**
- Requires GPU infrastructure
- More setup complexity
- Potentially lower accuracy

**Recommendation:** Start with GPT-4 for MVP, evaluate cost vs. performance after first 1000 users, consider hybrid approach (GPT-4 for complex extraction, fine-tuned open model for simpler tasks).

### 8.2 Prompt Engineering Strategy

#### Entity Extraction Prompt Template
```
You are an AI assistant that analyzes personal stories to extract meaningful information about relationships.

Story: "{user_story}"

Extract the following information in JSON format:
1. People mentioned (names)
2. When they met (if mentioned)
3. Shared experiences (activities, trips)
4. Preferences (likes/dislikes)
5. Locations
6. Timeline events
7. Suggested tags

Format:
{
  "people": [...],
  "timeline_events": [...],
  "preferences": [...],
  "locations": [...],
  "tags": [...],
  "relationships": [...]
}

Be precise. If information is unclear, indicate with "confidence" score 0-1.
```

### 8.3 Confidence & Validation

- **High Confidence (0.9-1.0):** Auto-save to database
- **Medium Confidence (0.7-0.89):** Show to user with "Confirm" button
- **Low Confidence (<0.7):** Flag for user review, don't auto-save

---

## 9. Security & Privacy

### 9.1 Data Protection
- End-to-end encryption for sensitive data
- User data isolation (multi-tenant architecture)
- GDPR compliance (right to deletion, data export)
- SOC 2 Type II compliance (future)

### 9.2 Authentication & Authorization
- Secure password hashing (bcrypt)
- JWT with refresh tokens
- Rate limiting on API endpoints
- CORS configuration

### 9.3 AI Processing Privacy
- Option to use local/self-hosted models
- Data anonymization before sending to third-party APIs
- Clear terms about AI processing

---

## 10. Development Phases

### Phase 1: MVP (Months 1-3)
- [ ] User authentication
- [ ] People management (CRUD)
- [ ] Story creation and viewing
- [ ] Basic AI entity extraction (OpenAI GPT-4)
- [ ] Preferences display
- [ ] Simple timeline view

**Target:** 100 beta users, validate core concept

### Phase 2: Enhanced Intelligence (Months 4-6)
- [ ] Network graph visualization
- [ ] Advanced AI insights
- [ ] Search and filtering
- [ ] Mobile-responsive design improvements
- [ ] Performance optimization

**Target:** 1,000 active users

### Phase 3: Social Features (Months 7-9)
- [ ] Meal planning assistant
- [ ] Seating arrangement tool
- [ ] Gift recommendation engine
- [ ] Export and sharing capabilities

**Target:** 10,000 users, monetization launch

### Phase 4: Mobile (Months 10-12)
- [ ] Expo React Native app
- [ ] Offline support
- [ ] Push notifications
- [ ] Device contacts integration

---

## 11. Open Questions & Risks

### Questions
1. Should users be able to share their people/network with others?
2. How to handle duplicate people detection?
3. What's the pricing model? (Freemium, subscription, one-time?)
4. Should we support collaborative stories (multiple users)?

### Risks
- **AI Accuracy:** Entity extraction may miss nuances (Mitigation: User feedback loop)
- **Cost:** LLM API costs could be high (Mitigation: Caching, batch processing)
- **Privacy Concerns:** Users may hesitate to input personal data (Mitigation: Clear privacy policy, local-first option)
- **Adoption:** Users may not see immediate value (Mitigation: Strong onboarding, quick wins)

---

## 12. Success Criteria

### Launch (End of Phase 1)
- [ ] 100 beta users signed up
- [ ] Average 3 stories per user per week
- [ ] 90%+ AI extraction accuracy on test dataset
- [ ] < 2 second story processing time

### Growth (End of Phase 3)
- [ ] 10,000 active users
- [ ] 40% 30-day retention
- [ ] NPS score > 50
- [ ] Revenue: $10K MRR

---

## 13. Appendix

### Example User Journey

**Scenario:** Sarah is planning a dinner party

1. **Opens app** → Dashboard shows upcoming birthdays and recent stories
2. **Creates event** → "Dinner party planning for 8 people"
3. **Selects guests** → App shows dietary restrictions and preferences
4. **Meal planning** → AI suggests menu based on group preferences
   - Shows: "6/8 people like Italian food"
   - Warnings: "John is vegetarian, Emma is allergic to nuts"
5. **Seating arrangement** → AI suggests optimal seating
   - "Seat Mark next to Lisa (both enjoy hiking)"
   - "Keep Tom and Jerry apart (different political views - noted from past stories)"
6. **Shopping list** → Generated automatically
7. **After party** → Sarah adds story: "Had amazing dinner, everyone loved the tiramisu"
8. **AI extracts** → Tiramisu added to "group likes"

---

**Document Owner:** Development Team
**Last Updated:** November 7, 2025
**Next Review:** End of Phase 1
