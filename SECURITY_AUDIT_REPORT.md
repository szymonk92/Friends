# Security Audit Report - Friends App

**Date:** 2026-02-05
**Auditor:** Claude Security Analysis
**Branch:** `claude/security-audit-plan-ruUVj`
**Status:** Pre-User Testing Security Review

---

## Executive Summary

This security audit identifies **7 known vulnerabilities** in dependencies, **15+ outdated packages**, and **4 critical code security issues** that should be addressed before user testing. The app has a solid foundation with local-first architecture, but requires immediate attention on API key storage and dependency updates.

### Risk Level: **MEDIUM-HIGH**

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| npm Vulnerabilities | 0 | 1 | 5 | 0 |
| Code Security Issues | 1 | 2 | 1 | 1 |
| Outdated Dependencies | - | 3 | 10+ | - |

---

## 1. Critical Security Vulnerabilities (npm audit)

### 1.1 HIGH Severity: glob CLI Command Injection
```
Package: glob (10.2.0 - 10.4.5)
Advisory: GHSA-5j98-mcp5-4vw2
CVSS: 7.5
Issue: Command injection via -c/--cmd executes matches with shell:true
Fix: Update to glob >= 10.5.0
```
**Impact:** Potential remote code execution if untrusted input is passed to glob CLI
**Action Required:** Update dependencies that pull in glob

### 1.2 MODERATE Severity: esbuild Development Server Vulnerability
```
Package: esbuild <= 0.24.2
Advisory: GHSA-67mh-4wv8-2f99
CVSS: 5.3
Issue: Any website can send requests to the development server and read the response
Dependency Chain: drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild
Fix: Update drizzle-kit
```
**Impact:** Development server information disclosure (dev only)
**Action Required:** Update drizzle-kit to latest version

### 1.3 MODERATE Severity: js-yaml Prototype Pollution
```
Package: js-yaml < 3.14.2 || >= 4.0.0 < 4.1.1
Advisory: GHSA-mh29-5h37-fv8m
CVSS: 5.3
Issue: Prototype pollution in merge (<<)
Affected: @eslint/eslintrc, @expo/xcpretty
Fix: Update affected packages
```
**Impact:** Potential object property manipulation
**Action Required:** Update ESLint and Expo packages

### 1.4 MODERATE Severity: Lodash Prototype Pollution
```
Package: lodash 4.0.0 - 4.17.21
Advisory: GHSA-xxjr-mmjv-4gpg
CVSS: 6.5
Issue: Prototype Pollution in _.unset and _.omit functions
Fix: Update to lodash >= 4.17.22
```
**Impact:** Potential data integrity issues
**Action Required:** Update lodash or packages depending on it

---

## 2. Code Security Issues

### 2.1 CRITICAL: API Key Stored in Plain Text AsyncStorage

**File:** `friends-mobile/store/useSettings.ts:20-23`

```typescript
// CURRENT (INSECURE)
setApiKey: async (key: string) => {
  await AsyncStorage.setItem(API_KEY_STORAGE_KEY, key);
  set({ apiKey: key });
}
```

**Risk:** HIGH
- AsyncStorage is NOT encrypted by default
- On rooted/jailbroken devices, API keys can be extracted
- On web builds, storage is accessible via browser dev tools

**Recommendation:** Use `expo-secure-store` which is already installed (v15.0.8)

```typescript
// RECOMMENDED FIX
import * as SecureStore from 'expo-secure-store';

setApiKey: async (key: string) => {
  await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key);
  set({ apiKey: key });
}
```

### 2.2 HIGH: AI API Response Not Validated

**File:** `friends-mobile/lib/ai/extraction.ts:109-120`

```typescript
const parsed = JSON.parse(jsonText.trim());
return {
  people: parsed.people || [],
  relations: parsed.relations || [],
  // ...
}
```

**Risk:** HIGH
- No validation of AI response structure before use
- Malformed responses could cause runtime errors or data corruption
- Zod schemas exist (`extractionResultSchema`) but are not used here

**Recommendation:** Validate AI response with existing Zod schema:

```typescript
import { extractionResultSchema } from '../validation/schemas';

const parsed = extractionResultSchema.parse(JSON.parse(jsonText.trim()));
```

### 2.3 HIGH: No Rate Limiting on AI Extraction

**File:** `friends-mobile/lib/ai/extraction.ts:51-128`

**Risk:** MEDIUM-HIGH
- No rate limiting implemented for AI extraction calls
- Users could accidentally trigger many expensive API calls
- No protection against API key abuse

**Recommendation:**
- Implement extraction queue with rate limiting
- Add daily extraction limit (configurable)
- Show cost estimation before extraction (function exists but not enforced)

### 2.4 MEDIUM: Secrets Encryption Details Missing

**File:** `friends-mobile/lib/db/schema.ts:301-328`

The `secrets` table stores `encryptedContent` and `encryptionSalt`, but:
- No encryption implementation found in codebase
- No key derivation function (KDF) implementation
- Encryption/decryption logic not yet implemented

**Risk:** Users might store sensitive data thinking it's encrypted when implementation is incomplete

**Recommendation:**
- Implement encryption before enabling secrets feature
- Use expo-crypto for AES encryption with proper key derivation
- Document encryption method for transparency

### 2.5 LOW: Console.error Logs in Production

**File:** `friends-mobile/lib/ai/extraction.ts:123`, `friends-mobile/store/useSettings.ts:25,35`

```typescript
console.error('AI extraction failed:', error);
console.error('Failed to save API key:', error);
```

**Risk:** LOW
- Error details could leak in production logs
- May expose internal implementation details

**Recommendation:** Use structured logging with log levels

---

## 3. Outdated Dependencies

### 3.1 Critical Updates (Security/Breaking Changes)

| Package | Current | Latest | Priority | Notes |
|---------|---------|--------|----------|-------|
| `zod` | 3.25.76 | **4.3.6** | HIGH | Major version upgrade (breaking changes) |
| `@anthropic-ai/sdk` | 0.68.0 | **0.72.1** | HIGH | API changes, security fixes |
| `drizzle-orm` | 0.44.7 | **0.45.1** | HIGH | Fixes vulnerability chain |
| `react` | 19.1.0 | **19.2.4** | MEDIUM | Bug fixes |
| `react-native` | 0.81.5 | **0.83.1** | MEDIUM | Security patches, performance |

### 3.2 Expo SDK Updates (Recommended)

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `expo` | 54.0.23 | 54.0.33 | Patch updates |
| `expo-router` | 6.0.14 | 6.0.23 | Bug fixes |
| `expo-secure-store` | 15.0.7 | 15.0.8 | Security fixes |
| `expo-sqlite` | 16.0.9 | 16.0.10 | Bug fixes |
| `expo-crypto` | 15.0.7 | 15.0.8 | Security fixes |
| `expo-file-system` | 19.0.17 | 19.0.21 | Bug fixes |
| `expo-image-picker` | 17.0.8 | 17.0.10 | Bug fixes |

### 3.3 Other Updates

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `react-native-reanimated` | 4.1.1 | 4.2.1 | Performance improvements |
| `react-native-screens` | 4.16.0 | 4.22.0 | Multiple fixes |
| `react-native-worklets` | 0.5.1 | 0.7.2 | Breaking changes possible |
| `react-hook-form` | 7.66.0 | 7.71.1 | Bug fixes |
| `react-native-paper` | 5.14.5 | 5.15.0 | New features |
| `@react-navigation/native` | 7.1.8 | 7.1.28 | Bug fixes |
| `@tanstack/react-query` | 5.90.7 | 5.90.20 | Bug fixes |
| `zustand` | 5.0.8 | 5.0.11 | Bug fixes |

---

## 4. Security Strengths (What's Good)

1. **Local-First Architecture** - Data never leaves device, reduces attack surface
2. **Type Safety** - Strict TypeScript prevents many runtime errors
3. **Parameterized Queries** - Drizzle ORM prevents SQL injection
4. **Zod Validation Schemas** - Input validation framework in place
5. **Soft Deletes** - Data recovery possible, prevents accidental loss
6. **UUID Primary Keys** - Non-sequential IDs prevent enumeration
7. **CI/CD Security Scanning** - npm audit in GitHub Actions
8. **expo-secure-store Available** - Proper tool available for sensitive storage
9. **Proper .gitignore** - Secrets excluded from version control

---

## 5. Pre-User Testing Action Plan

### Phase 1: Critical (Before Any Testing)

| # | Task | Priority | Effort | Risk if Skipped |
|---|------|----------|--------|-----------------|
| 1 | Migrate API key storage from AsyncStorage to SecureStore | CRITICAL | 2h | API key theft |
| 2 | Add Zod validation to AI extraction response | HIGH | 1h | Data corruption |
| 3 | Run `npm audit fix` for auto-fixable vulnerabilities | HIGH | 30m | Known exploits |
| 4 | Update `drizzle-kit` to fix esbuild vulnerability | HIGH | 1h | Dev server leak |

### Phase 2: Important (Before Beta Testing)

| # | Task | Priority | Effort | Risk if Skipped |
|---|------|----------|--------|-----------------|
| 5 | Update `@anthropic-ai/sdk` to 0.72.1 | MEDIUM | 1h | API compatibility |
| 6 | Update Expo packages to latest patch versions | MEDIUM | 2h | Bug exposure |
| 7 | Implement extraction rate limiting | MEDIUM | 4h | Cost overrun |
| 8 | Add extraction cost confirmation dialog | MEDIUM | 2h | Unexpected charges |

### Phase 3: Recommended (Before Public Release)

| # | Task | Priority | Effort | Risk if Skipped |
|---|------|----------|--------|-----------------|
| 9 | Implement secrets encryption (if feature enabled) | MEDIUM | 8h | Data exposure |
| 10 | Evaluate Zod v4 migration (breaking changes) | LOW | 4h | Technical debt |
| 11 | Add structured logging (remove console.error) | LOW | 2h | Debug difficulty |
| 12 | Implement certificate pinning for AI API calls | LOW | 4h | MITM attacks |

---

## 6. Recommended Update Commands

### Immediate Fixes
```bash
cd friends-mobile

# Fix auto-fixable vulnerabilities
npm audit fix

# Update critical packages
npm install @anthropic-ai/sdk@latest
npm install drizzle-orm@latest drizzle-kit@latest

# Update Expo packages (use expo install for compatibility)
npx expo install expo@latest expo-secure-store@latest expo-crypto@latest
```

### Full Update (Test Thoroughly)
```bash
# Update all Expo-managed packages
npx expo install --check
npx expo install --fix

# Update remaining packages
npm update

# Re-run audit
npm audit
```

---

## 7. Testing Recommendations After Fixes

1. **Regression Tests**
   - Run full test suite: `npm run test:ci`
   - Verify AI extraction still works
   - Test API key save/load flow with SecureStore

2. **Security Tests**
   - Verify API key not accessible in AsyncStorage
   - Test with invalid AI responses (fuzzing)
   - Verify rate limiting works

3. **Platform Tests**
   - Test on iOS (SecureStore uses Keychain)
   - Test on Android (SecureStore uses Keystore)
   - Test web build (SecureStore limitations)

---

## 8. Files Requiring Changes

| File | Changes Needed |
|------|---------------|
| `store/useSettings.ts` | Migrate to expo-secure-store |
| `lib/ai/extraction.ts` | Add Zod validation, rate limiting |
| `package.json` | Dependency updates |
| `lib/db/secrets.ts` | Implement encryption (new file) |

---

## Appendix A: Full npm audit Output

```
7 vulnerabilities (5 moderate, 1 high, 1 in transitive dependencies)

High:
- glob: Command injection (10.2.0 - 10.4.5)

Moderate:
- esbuild: Development server information disclosure
- @esbuild-kit/core-utils: Transitive dependency
- @esbuild-kit/esm-loader: Transitive dependency
- drizzle-kit: Pulls in vulnerable esbuild
- js-yaml: Prototype pollution
- lodash: Prototype pollution
```

---

## Appendix B: Positive Security Observations

- No hardcoded secrets in codebase
- No use of `eval()` or `Function()` constructor
- No direct SQL string concatenation
- Proper foreign key constraints with cascade deletes
- Database indexes optimize queries without exposing data
- User data segregation via userId foreign keys
- Timestamps for audit trails (createdAt, updatedAt)

---

**Report Prepared For:** Pre-user testing security review
**Next Review Date:** After implementing Phase 1 fixes
**Contact:** Repository maintainers
