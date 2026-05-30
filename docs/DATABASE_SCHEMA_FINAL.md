# Database Schema

**Source of truth:** `friends-mobile/lib/db/schema.ts`

All migrations in `friends-mobile/drizzle/`. Generate new migrations with `npm run db:generate`, apply with `npm run db:migrate`.

---

## Tables (15 total)

### Auth
| Table | Purpose |
|-------|---------|
| `users` | Single local user profile + subscription tier |
| `magic_link_tokens` | Magic link auth tokens (future cloud use) |
| `sessions` | Auth sessions (future cloud use) |

### Core Data
| Table | Purpose |
|-------|---------|
| `people` | People in your network (name, relationship type, importance, photo) |
| `connections` | Person-to-person connections (strength, last contact) |
| `relations` | Extracted or manual relations (type, value, confidence, source story) |
| `stories` | Text stories entered by user |
| `secrets` | Sensitive personal notes, biometric-locked |
| `contact_events` | Log of contact events with people |
| `relationship_history` | Audit log of relationship changes over time |
| `events` | Shared events / experiences |
| `files` | Attached media files |
| `pending_extractions` | AI extraction queue (stories awaiting review) |

### App State
| Table | Purpose |
|-------|---------|
| `quiz_dismissals` | Tracks dismissed preference quizzes per person |
| `reminders` | Scheduled reminders for people |

---

## Design Conventions
- **UUIDs** everywhere (via `expo-crypto.randomUUID()`)
- **Timestamps**: `createdAt`, `updatedAt` on all tables
- **Soft deletes**: `deletedAt` on people, relations, stories, secrets
- **Lifecycle fields**: `status` (current/past/future), `validFrom`, `validTo` on relations
- **Confidence scores**: `0.0–1.0` on AI-extracted relations

---

## Relation Types (20)
`LIKES`, `DISLIKES`, `IS`, `BELIEVES`, `FEARS`, `CARES_FOR`, `KNOWS`, `WORKS_WITH`,
`FAMILY_OF`, `FRIEND_OF`, `ROMANTIC_WITH`, `HATES`, `TRUSTS`, `DISTRUST`,
`COMPETES_WITH`, `MENTORS`, `FOLLOWS`, `SHARES_INTEREST`, `LIVES_IN`, `VISITED`

See [RELATION_USAGE_GUIDE.md](RELATION_USAGE_GUIDE.md) for decision trees and examples.
