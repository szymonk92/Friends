# Production Considerations - Friends App

**Critical questions answered before implementation**

---

## 🎯 Final Architecture Decision

✅ **SQLite + Drizzle ORM** for Phase 1
- Keep door open for RDF later if needed
- Focus on getting to market fast

---

## 📊 Scalability: 100+ People Performance

### Performance Requirements

**Target:**
- 100 people in network
- ~500 preferences
- ~200 stories
- ~150 connections
- Total: ~5,000-10,000 database rows

### SQLite Performance at Scale

```typescript
// Test data volume
100 people × 5 preferences = 500 rows
100 people × 2 stories each = 200 rows
100 people × 1.5 connections each = 150 rows
────────────────────────────────────────
Total: ~850 rows (very manageable!)

// With proper indexes:
- Person lookup: <1ms
- Network graph: 10-20ms (all connections)
- Preferences query: 2-5ms
- Full-text search: 10-30ms
```

### Optimization Strategies

#### 1. **Pagination for Large Lists**

```typescript
// DON'T load all 100 people at once
const allPeople = await db.select().from(people); // ❌ Slow

// DO use pagination
const ITEMS_PER_PAGE = 20;
const page1 = await db
  .select()
  .from(people)
  .limit(ITEMS_PER_PAGE)
  .offset(0); // ✅ Fast
```

#### 2. **Virtual Scrolling for UI**

```typescript
// Use react-window or react-virtualized
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={100}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <PersonRow style={style} person={people[index]} />
  )}
</FixedSizeList>
```

#### 3. **Network Graph Optimization**

```typescript
// For 100 people graph visualization
// Problem: 100 nodes × 100 potential edges = 10,000 calculations

// Solution 1: Show only top N connections
const topConnections = await db
  .select()
  .from(connections)
  .orderBy(desc(connections.strength))
  .limit(50); // Only show strongest 50

// Solution 2: Filter by relationship type
<NetworkGraph
  filter={{
    minStrength: 0.5, // Only show strong connections
    relationshipTypes: ['friend', 'family'], // Exclude weak ties
  }}
/>

// Solution 3: Clustering for large graphs
// Group people into clusters (work, family, friends)
const clusters = groupPeopleByClusters(people);
// Show clusters as meta-nodes, expand on click
```

#### 4. **Debounced Search**

```typescript
// Don't search on every keystroke
import { useDebouncedValue } from '@mantine/hooks';

const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery] = useDebouncedValue(searchQuery, 300);

useEffect(() => {
  if (debouncedQuery) {
    searchPeople(debouncedQuery);
  }
}, [debouncedQuery]);
```

### Storage Size Estimates

```
100 people:
- Database: ~1-2 MB
- Profile photos (optimized): ~10 MB (100 KB each)
- Story attachments: ~50 MB
─────────────────────────────────────
Total: ~60 MB (very small!)

Even 1,000 people: ~600 MB (manageable)
```

**Verdict:** ✅ SQLite handles 100+ people easily!

---

## 🔐 Secrets & Privacy Features

### Use Case: Private Notes

**Scenario:** User wants to keep sensitive info (passwords, medical info, private thoughts) that shouldn't show up in normal views.

### Implementation: Password-Protected Secrets

#### Database Schema

```typescript
export const secrets = sqliteTable('secrets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  personId: text('person_id').references(() => people.id),
  title: text('title').notNull(), // "Medical info", "Private note"
  encryptedContent: text('encrypted_content').notNull(), // AES-256 encrypted
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

#### Encryption Strategy

```typescript
import crypto from 'crypto';

// User sets master password (once, at setup)
const MASTER_PASSWORD = 'user-chosen-password';

// Derive encryption key from password
function deriveKey(password: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

// Encrypt secret
function encryptSecret(content: string, password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Store: salt:iv:encryptedData
  return `${salt}:${iv.toString('hex')}:${encrypted}`;
}

// Decrypt secret
function decryptSecret(encryptedData: string, password: string): string {
  const [salt, ivHex, encrypted] = encryptedData.split(':');
  const key = deriveKey(password, salt);
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

#### UI/UX for Secrets

```
╔═══════════════════════════════════════════════════════════════╗
║  Ola's Profile                                    [Edit] ⚙️   ║
╠═══════════════════════════════════════════════════════════════╣
║  Tabs: [Overview] [Preferences] [Timeline] [Secrets] 🔒      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  SECRETS (2) 🔒                                               ║
║  ─────────────────────────────────────────────────────────────║
║                                                                ║
║  ⚠️  This section contains sensitive information.            ║
║  Enter master password to unlock:                            ║
║                                                                ║
║  Password: [********************] [Unlock 🔓]                ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝

After unlock:
╔═══════════════════════════════════════════════════════════════╗
║  SECRETS (2) 🔓 Unlocked                    [Lock] [+ Add]   ║
║  ─────────────────────────────────────────────────────────────║
║                                                                ║
║  📝 Medical Information                        [Edit] [Delete]║
║  Blood type: O+, Allergic to penicillin                      ║
║  Created: Jan 15, 2024                                       ║
║                                                                ║
║  ─────────────────────────────────────────────────────────────║
║                                                                ║
║  💭 Private Thoughts                           [Edit] [Delete]║
║  Reminder: Ola dislikes talking about...                     ║
║  Created: Feb 3, 2024                                        ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
```

#### Security Best Practices

1. **Master password never stored** - Only derived key in memory
2. **Auto-lock after 5 minutes** of inactivity
3. **Secrets excluded from:**
   - Search results
   - AI extraction
   - Export (unless explicitly checked)
4. **Optional: Biometric unlock** (fingerprint, Face ID on mobile)

```typescript
// Auto-lock secrets after inactivity
let lastActivity = Date.now();
let secretsUnlocked = false;

function checkAutoLock() {
  if (secretsUnlocked && Date.now() - lastActivity > 5 * 60 * 1000) {
    lockSecrets();
    showNotification('Secrets auto-locked after 5 min inactivity');
  }
}

setInterval(checkAutoLock, 60000); // Check every minute
```

---

## 💰 Monetization Strategy

### Free Tier

**Generous free tier to build user base:**

- ✅ Up to 50 people
- ✅ Unlimited stories
- ✅ All core features (preferences, timeline, basic search)
- ✅ Local storage only
- ✅ Manual export/import
- ❌ No cloud sync
- ❌ No AI extraction (or 10 stories/month)
- ❌ No advanced visualizations

### Premium Tier ($4.99/month or $49/year)

**Unlock advanced features:**

- ✅ **Unlimited people**
- ✅ **AI entity extraction** (unlimited)
- ✅ **Cloud backup & sync** (encrypted)
- ✅ **Advanced visualizations** (network graph, insights)
- ✅ **Meal planning assistant**
- ✅ **Gift recommendations**
- ✅ **Priority support**
- ✅ **Export to multiple formats** (PDF, JSON, Turtle)

### Pro Tier ($9.99/month or $99/year)

**For power users:**

- ✅ Everything in Premium
- ✅ **Multi-device sync** (desktop + mobile)
- ✅ **Collaboration** (share networks with family)
- ✅ **Advanced AI** (GPT-4, Claude Opus)
- ✅ **Custom fields & relations**
- ✅ **API access** (for integrations)
- ✅ **White-label** (remove branding)

### Implementation

```typescript
// License check
interface License {
  tier: 'free' | 'premium' | 'pro';
  validUntil: Date;
  features: string[];
}

function checkFeatureAccess(feature: string): boolean {
  const license = getLicense();

  if (license.tier === 'free') {
    return ['basic_crud', 'local_storage', 'manual_export'].includes(feature);
  }

  if (license.tier === 'premium') {
    return !['api_access', 'white_label'].includes(feature);
  }

  return true; // Pro has all features
}

// Usage
if (!checkFeatureAccess('ai_extraction')) {
  showUpgradeModal('AI extraction requires Premium');
  return;
}

// Soft limits for free tier
async function checkPeopleLimit(): Promise<boolean> {
  const license = getLicense();

  if (license.tier === 'free') {
    const peopleCount = await db.select({ count: sql`count(*)` }).from(people);

    if (peopleCount[0].count >= 50) {
      showUpgradeModal('Free tier limited to 50 people. Upgrade to add more!');
      return false;
    }
  }

  return true;
}
```

### License Validation

```typescript
// Store license key encrypted in local storage
interface StoredLicense {
  key: string; // License key from server
  tier: 'free' | 'premium' | 'pro';
  email: string;
  validUntil: string; // ISO date
  signature: string; // HMAC signature from server
}

// Validate license on app start
async function validateLicense(): Promise<boolean> {
  const storedLicense = getStoredLicense();

  if (!storedLicense) {
    return false; // Free tier
  }

  // 1. Check expiration
  if (new Date(storedLicense.validUntil) < new Date()) {
    showNotification('License expired. Please renew.');
    return false;
  }

  // 2. Verify signature (prevent tampering)
  const isValid = verifyLicenseSignature(storedLicense);

  if (!isValid) {
    showNotification('Invalid license. Please contact support.');
    return false;
  }

  // 3. Optional: Check with server (online validation)
  try {
    const response = await fetch('https://api.friends.app/validate-license', {
      method: 'POST',
      body: JSON.stringify({ key: storedLicense.key }),
    });

    const { valid } = await response.json();
    return valid;
  } catch (error) {
    // Allow offline use if can't reach server
    console.warn('License validation failed (offline). Using cached license.');
    return true; // Trust cached license
  }
}
```

---

## 🔒 Security Considerations

### 1. **Local Data Protection**

```typescript
// Encrypt database at rest (optional for paranoid users)
import SQLCipher from '@journeyapps/sqlcipher';

const db = new SQLCipher('friends.db');
db.pragma(`key = '${userPassword}'`); // Encrypt with password

// Or use OS-level encryption
// - macOS: FileVault
// - Windows: BitLocker
// - Linux: LUKS
```

### 2. **Prevent SQL Injection**

```typescript
// ✅ GOOD: Parameterized queries (Drizzle handles this)
const person = await db
  .select()
  .from(people)
  .where(eq(people.name, userInput)); // Safe!

// ❌ BAD: String concatenation (DON'T DO THIS)
const query = `SELECT * FROM people WHERE name = '${userInput}'`; // ❌ Vulnerable!
```

### 3. **Sanitize User Input**

```typescript
import DOMPurify from 'dompurify';

// For displaying user stories (prevent XSS)
function displayStory(content: string) {
  const clean = DOMPurify.sanitize(content);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### 4. **Secure API Key Storage**

```typescript
// For AI proxy API key
// NEVER store in code or git!

// ✅ Store in OS keychain
import keytar from 'keytar';

await keytar.setPassword('friends-app', 'openai-key', apiKey);
const apiKey = await keytar.getPassword('friends-app', 'openai-key');

// Or use electron-store with encryption
import Store from 'electron-store';

const store = new Store({
  encryptionKey: 'user-derived-key',
});

store.set('apiKey', userApiKey);
```

### 5. **Rate Limiting (for AI proxy)**

```typescript
// Prevent abuse of AI features
import rateLimit from 'express-rate-limit';

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 AI requests per 15 min
  message: 'Too many AI requests. Please try again later.',
});

app.post('/api/extract', aiLimiter, async (req, res) => {
  // AI extraction logic
});
```

---

## 🎨 UX/Usability Best Practices

### 1. **Onboarding Flow**

```
Step 1: Welcome
───────────────────────────────────────────────────
  Welcome to Friends! 👋

  Keep track of the people you care about.
  Never forget what matters.

  [Get Started] →

Step 2: Choose Data Location
───────────────────────────────────────────────────
  Where should we store your data?

  ○ Local only (recommended)
    Your data stays on this device. Private & fast.

  ○ Cloud sync (Premium)
    Sync across devices. Requires account.

  [Continue] →

Step 3: Optional AI Setup
───────────────────────────────────────────────────
  Enable AI-powered extraction?

  ✓ Automatically extract preferences from stories
  ✓ Suggest connections and insights

  Choose AI provider:
  ○ OpenAI (most accurate)
  ○ Local models (private, free)
  ○ Skip for now

  [Continue] →

Step 4: Import Contacts (Optional)
───────────────────────────────────────────────────
  Import existing contacts?

  [Import from Phone] [Import from CSV] [Skip]

Step 5: First Story
───────────────────────────────────────────────────
  Let's add your first memory!

  Write a story about someone:

  ┌─────────────────────────────────────────────┐
  │ I met my friend Alex at...                  │
  │                                              │
  └─────────────────────────────────────────────┘

  [Add Story] [Skip]

Step 6: Done!
───────────────────────────────────────────────────
  You're all set! 🎉

  ✓ Data stored locally
  ✓ AI extraction enabled
  ✓ 1 person added

  [Explore App] →
```

### 2. **Empty States**

```
╔═══════════════════════════════════════════════════════════════╗
║  No people yet                                                 ║
║                                                                 ║
║  👥  Your network is empty!                                   ║
║                                                                 ║
║  Get started by:                                               ║
║  • Writing a story about someone                              ║
║  • Adding a person manually                                   ║
║  • Importing your contacts                                    ║
║                                                                 ║
║  [Write First Story] [Add Person] [Import]                    ║
╚═══════════════════════════════════════════════════════════════╝
```

### 3. **Loading States**

```typescript
// Show progress for AI extraction
<div className="ai-extraction-progress">
  <Spinner />
  <p>Analyzing story...</p>
  <ProgressBar value={75} />
  <p className="text-sm text-gray-500">
    Found: 2 people, 5 preferences, 3 locations
  </p>
</div>
```

### 4. **Error Handling**

```typescript
// User-friendly error messages
try {
  await extractWithAI(story);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    showNotification({
      title: 'AI limit reached',
      message: 'You've used your daily AI quota. Upgrade to Premium for unlimited!',
      action: { label: 'Upgrade', onClick: () => showUpgradeModal() },
    });
  } else if (error.code === 'NETWORK_ERROR') {
    showNotification({
      title: 'No internet connection',
      message: 'AI extraction requires internet. Your story was saved locally.',
      type: 'warning',
    });
  } else {
    showNotification({
      title: 'Something went wrong',
      message: 'Please try again or contact support.',
      type: 'error',
    });
  }
}
```

### 5. **Keyboard Shortcuts**

```typescript
// Power user features
const shortcuts = {
  'Cmd+N': 'New person',
  'Cmd+K': 'Search',
  'Cmd+S': 'Save/Sync',
  'Cmd+,': 'Settings',
  'Cmd+/': 'Show shortcuts',
  'Esc': 'Close modal',
};

// Display shortcuts modal
<ShortcutsModal shortcuts={shortcuts} />
```

---

## 🌐 Server Connections

### What Needs Server?

**Optional server for:**
1. ✅ AI extraction (protect API keys)
2. ✅ Cloud sync (Premium feature)
3. ✅ License validation
4. ✅ Analytics (opt-in)
5. ❌ Core features (all local!)

### Server Architecture (Minimal)

```
User's Device (Primary):
├── SQLite database (all data)
├── Full app functionality
└── Optional: Call server for AI/sync

Optional Server (Lightweight):
├── AI Proxy (no data storage)
├── License validation
├── Cloud backup storage (encrypted)
└── Sync coordination
```

### Sync Implementation (Premium Feature)

```typescript
// End-to-end encrypted sync
class CloudSync {
  async syncToCloud() {
    // 1. Export local DB to JSON
    const data = await exportDatabase();

    // 2. Encrypt with user's key (NOT stored on server)
    const encrypted = encryptData(data, userEncryptionKey);

    // 3. Upload to server
    await fetch('https://api.friends.app/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${licenseKey}` },
      body: encrypted,
    });

    // Server NEVER sees unencrypted data!
  }

  async syncFromCloud() {
    // 1. Download encrypted backup
    const response = await fetch('https://api.friends.app/sync');
    const encrypted = await response.text();

    // 2. Decrypt locally
    const data = decryptData(encrypted, userEncryptionKey);

    // 3. Merge with local data (conflict resolution)
    await mergeWithLocal(data);
  }
}
```

---

## 📦 App Storage & File Management

### Images: Profile Photos & Attachments

**Yes, definitely support images!**

#### Storage Strategy

```typescript
// Store images in user's file system
const STORAGE_DIR = path.join(os.homedir(), 'Documents', 'Friends', 'attachments');

// Create directories
├── ~/Documents/Friends/
│   ├── friends.db              # SQLite database (~5 MB)
│   ├── attachments/
│   │   ├── profile-photos/     # Profile pics
│   │   │   ├── ola-abc123.jpg  # UUID-based filenames
│   │   │   └── simon-def456.jpg
│   │   ├── story-images/       # Story attachments
│   │   │   ├── italy-2020-1.jpg
│   │   │   └── italy-2020-2.jpg
│   │   └── thumbnails/         # Optimized thumbnails
│   │       ├── ola-abc123-thumb.jpg (50 KB)
│   │       └── simon-def456-thumb.jpg
│   └── backups/
│       └── friends-2024-11-07.db
```

#### Image Optimization

```typescript
import sharp from 'sharp';

async function optimizeImage(filePath: string, type: 'profile' | 'attachment'): Promise<string> {
  const id = crypto.randomUUID();
  const outputPath = type === 'profile'
    ? path.join(STORAGE_DIR, 'profile-photos', `${id}.jpg`)
    : path.join(STORAGE_DIR, 'story-images', `${id}.jpg`);

  // Optimize and resize
  await sharp(filePath)
    .resize({
      width: type === 'profile' ? 400 : 1200,
      height: type === 'profile' ? 400 : 1200,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, progressive: true })
    .toFile(outputPath);

  // Create thumbnail
  const thumbPath = path.join(STORAGE_DIR, 'thumbnails', `${id}-thumb.jpg`);
  await sharp(outputPath)
    .resize(150, 150, { fit: 'cover' })
    .jpeg({ quality: 70 })
    .toFile(thumbPath);

  return id; // Store ID in database, not full path
}

// In database
export const people = sqliteTable('people', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  photoId: text('photo_id'), // References file: {id}.jpg
  // ...
});
```

#### Storage Limits

```
Free Tier:
- Profile photos: 50 × 100 KB = 5 MB
- Story images: 100 × 200 KB = 20 MB
- Total: ~25 MB (reasonable!)

Premium Tier:
- Unlimited local storage
- Cloud backup: 1 GB included
- Pro: 10 GB

Optimization:
- Profile photos: 400×400, 85% quality = ~100 KB
- Story images: 1200×1200, 85% quality = ~200 KB
- Thumbnails: 150×150, 70% quality = ~10 KB
```

#### UI for Image Upload

```typescript
<ImageUpload
  type="profile"
  onUpload={async (file) => {
    const imageId = await optimizeImage(file.path, 'profile');

    await db
      .update(people)
      .set({ photoId: imageId })
      .where(eq(people.id, personId));

    showNotification('Photo updated!');
  }}
  maxSize={10 * 1024 * 1024} // 10 MB max
  accept=".jpg,.jpeg,.png,.heic"
/>
```

---

## 🚀 Final Checklist

### Phase 1 MVP Must-Haves:

- [x] ✅ SQLite + Drizzle ORM
- [x] ✅ 8 core relations (KNOWS, LIKES, etc.)
- [x] ✅ Local storage (privacy-first)
- [x] ✅ Profile photos support
- [x] ✅ Secrets (encrypted notes)
- [x] ✅ Free tier (50 people limit)
- [x] ✅ Basic visualizations
- [x] ✅ Search & filtering
- [x] ✅ Export/import (JSON)

### Phase 1.5 (Post-MVP):

- [ ] Premium tier with license validation
- [ ] AI extraction (via proxy)
- [ ] Cloud sync (encrypted)
- [ ] Advanced visualizations
- [ ] Meal planning assistant

### Security Checklist:

- [x] ✅ Encrypted secrets (AES-256)
- [x] ✅ Secure API key storage (keychain)
- [x] ✅ No SQL injection (parameterized queries)
- [x] ✅ XSS protection (DOMPurify)
- [x] ✅ Rate limiting (AI proxy)
- [x] ✅ Auto-lock for secrets (5 min)

### UX Checklist:

- [x] ✅ Onboarding flow (5 steps)
- [x] ✅ Empty states
- [x] ✅ Loading indicators
- [x] ✅ Error handling
- [x] ✅ Keyboard shortcuts
- [x] ✅ Pagination (for 100+ people)
- [x] ✅ Virtual scrolling
- [x] ✅ Debounced search

---

## 💡 Answers to Your Questions

### ✅ Can 100 people visualizations work?
**Yes!** With pagination, virtual scrolling, and proper indexing, SQLite handles this easily.

### ✅ Can we have password-protected secrets?
**Yes!** AES-256 encryption with master password. Auto-locks after 5 min.

### ✅ What about premium features?
**Free tier:** 50 people, basic features
**Premium ($4.99/mo):** Unlimited people, AI, cloud sync
**Pro ($9.99/mo):** Multi-device, collaboration, API

### ✅ Security concerns?
- Encrypted secrets
- Secure keychain for API keys
- SQL injection prevention
- Optional database encryption

### ✅ Can we add images?
**Yes!** Profile photos + story attachments. Optimized with Sharp (100 KB per photo).

### ✅ What needs server?
**Only optional:**
- AI proxy (protect keys)
- Cloud sync (Premium)
- License validation

**Core app:** 100% local, works offline!

---

**Ready to start building?** 🚀

Next step: Create final database schema with all these considerations!
