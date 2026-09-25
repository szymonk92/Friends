# FriendZ — Documentation

AI-powered social memory manager. All app code lives in `friends-mobile/`.

---

## Quick Start

```bash
cd friends-mobile
npm install
npm run android     # or ios / web
npm run ci          # typecheck + lint + test before committing
```

---

## Active Docs

### Database & Storage
| Doc | Purpose |
|-----|---------|
| [DATABASE_SCHEMA_FINAL.md](DATABASE_SCHEMA_FINAL.md) | Table overview (source of truth: `lib/db/schema.ts`) |
| [DATABASE_CONSTRAINTS.md](DATABASE_CONSTRAINTS.md) | Validation rules and business logic |
| [SQLITE_DRIZZLE_GUIDE.md](SQLITE_DRIZZLE_GUIDE.md) | SQLite + Drizzle ORM patterns |

### AI & Extraction
| Doc | Purpose |
|-----|---------|
| [AI_EXTRACTION_STRATEGY.md](AI_EXTRACTION_STRATEGY.md) | Pipeline design: cost, speed, accuracy |
| [AI_MODEL_SELECTION.md](AI_MODEL_SELECTION.md) | Claude vs Gemini — how to configure models |
| [AI_ERROR_HANDLING.md](AI_ERROR_HANDLING.md) | Retry strategy and user-facing error messages |
| [QUICK_START_AI_MODELS.md](QUICK_START_AI_MODELS.md) | 3-step guide for setting up AI keys in the app |
| [CONFLICT_DETECTION.md](CONFLICT_DETECTION.md) | Conflict detection for relation extractions |

### Relations & Relationships
| Doc | Purpose |
|-----|---------|
| [RELATION_USAGE_GUIDE.md](RELATION_USAGE_GUIDE.md) | Decision trees for choosing the right relation type |
| [RELATION_METADATA_SCHEMAS.md](RELATION_METADATA_SCHEMAS.md) | Metadata structure for all 20 relation types |
| [RELATIONSHIP_LIFECYCLE.md](RELATIONSHIP_LIFECYCLE.md) | Handling breakups, archival, status changes |
| [CONNECTIONS.md](CONNECTIONS.md) | Person-to-person connection model |
| [EXAMPLE_STORIES_AND_RELATIONS.md](EXAMPLE_STORIES_AND_RELATIONS.md) | Real-world examples of all relation types |
| [VISUALIZATION_AND_EXAMPLES.md](VISUALIZATION_AND_EXAMPLES.md) | Visualization architecture and examples |
| [AGENT_MENTION_REFERENCE.md](AGENT_MENTION_REFERENCE.md) | @mention syntax for people in stories |

### Build & Testing
| Doc | Purpose |
|-----|---------|
| [BUILD_GUIDE.md](BUILD_GUIDE.md) | Building APK/IPA for device distribution |
| [QUICK_BUILD.md](QUICK_BUILD.md) | EAS cloud build cheat sheet |
| [TEST_STRATEGY.md](TEST_STRATEGY.md) | Test coverage approach and priorities |
| [SECURITY_REPORT.md](SECURITY_REPORT.md) | SQL injection test results |
| [PERFORMANCE_BENCHMARKS.md](PERFORMANCE_BENCHMARKS.md) | Query performance on 10k+ records |

### Design
| Doc | Purpose |
|-----|---------|
| [FIGMA_DESIGN_GUIDE.md](FIGMA_DESIGN_GUIDE.md) | Wireframes and design system |
| [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md) | Market landscape and differentiation |

---

## Archive

Historical planning and session notes live in [`archive/`](archive/). Not actively maintained.
