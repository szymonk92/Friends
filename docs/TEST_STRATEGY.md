# Friends App - Test Strategy

## Overview
This document outlines the minimal test coverage for the most important functionality of the Friends mobile app.

## Priority 1: Core Data Operations (IMPLEMENTED ✓)

### Integration Test
**File:** `components/__tests__/AppIntegration-test.tsx`

**Coverage:**
- Creating multiple people (bulk operations)
- Creating relations between people
- Creating preference relations (likes/dislikes)
- Creating stories

**Why Important:** These are the fundamental operations that users perform. If these fail, the app is unusable.

**Status:** ✅ Passing

## Priority 2: AI Extraction (IMPLEMENTED ✓)

### AI Service Tests
**File:** `lib/ai/__tests__/ai-service.test.ts`

**Coverage:**
- JSON parsing from markdown-wrapped responses
- Anthropic API integration
- Gemini API integration
- Error handling for invalid responses
- Token usage tracking

**Why Important:** AI extraction is the core value proposition. Users enter stories, and AI extracts structured data.

**Status:** ✅ Passing

### Conflict Detection
**File:** `lib/ai/__tests__/conflict-detection.test.ts`

**Coverage:**
- Detecting contradictions in extracted data
- Identifying duplicate people/relations
- Handling confidence scores

**Why Important:** Prevents data integrity issues from AI mistakes.

**Status:** ✅ Passing

## Priority 3: Database Operations (HIGH PRIORITY - TEAM REQUIREMENT)

### Database Operations
**Recommended File:** `lib/db/__tests__/crud-operations.test.ts`

**Coverage Needed:**
- Person CRUD operations
- Relation CRUD operations
- Story CRUD operations with extraction linkage
- Transaction handling
- Cascade deletes

**Why Important:** Ensures data consistency and prevents orphaned records.

**Status:** ⚠️ **HIGH PRIORITY - Not yet implemented**

### Relation Validation
**Recommended File:** `lib/db/__tests__/relation-validation.test.ts`

**Coverage Needed:**
- Valid relation types
- Preventing circular dependencies
- Confidence score bounds
- Required fields validation

**Why Important:** Maintains data quality and prevents invalid states.

**Status:** ⚠️ **HIGH PRIORITY - Not yet implemented**

## Priority 4: Search & Filter (HIGH PRIORITY - TEAM REQUIREMENT)

### Search & Filter
**Recommended File:** `lib/__tests__/search-filter.test.ts`

**Coverage Needed:**
- Person search by name/tags
- Story search by content/date
- Relation filtering by type
- Performance with large datasets

**Why Important:** Users need to find information quickly.

**Status:** ⚠️ **HIGH PRIORITY - Not yet implemented**

## Deferred: Story Extraction Flow

### Story Extraction Flow
**File:** `lib/__tests__/story-extraction-flow.test.ts`

**Status:** ⏸️ **DEFERRED - Changes planned for this feature**

This test suite will be implemented after the planned changes to the story extraction flow.

## Test Coverage Summary

| Component | Coverage | Priority | Status |
|-----------|----------|----------|--------|
| Core Data Operations | ✅ Integration test | P1 | Passing |
| AI Extraction | ✅ Service + parsing | P2 | Passing |
| Conflict Detection | ✅ Full coverage | P2 | Passing |
| **Database Operations** | ✅ **19 tests** | **P3 - HIGH** | **✅ Passing** |
| **Relation Validation** | ✅ **24 tests** | **P3 - HIGH** | **✅ Passing** |
| **Search & Filter** | ✅ **18 tests** | **P4 - HIGH** | **✅ Passing** |
| **Edge Cases & Stress** | ✅ **31 tests** | **P3 - HIGH** | **✅ Passing** |
| Story Extraction Flow | ⏸️ Deferred | P5 | Changes planned |

**Total: 129 tests passing**

### Performance Benchmarks (10k Records)
- Search: **1ms** ✅
- Filter: **1ms** ✅  
- Memory: **2.5MB** ✅

See [PERFORMANCE_BENCHMARKS.md](file:///Users/szymonklepacz/Documents/AI.nosync/Friends/friends-mobile/PERFORMANCE_BENCHMARKS.md) for details.

## Recommendations for Team Testing

### Before Release
1. **Run all existing tests:** `npx jest`
2. **Manual testing focus areas:**
   - Add 5-10 people with stories
   - Test AI extraction with various story formats
   - Verify relation creation and editing
   - Test search functionality
   - Check birthday reminders
   - Verify data export/import

### Critical Paths to Test Manually
1. **Onboarding** → Add first person → Add first story → Verify extraction
2. **Network view** → Verify graph renders correctly with multiple connections
3. **Settings** → Change theme → Verify persistence
4. **Secrets** → Add secret → Verify biometric protection works

### Performance Testing
- Test with 100+ people in database
- Test with 500+ relations
- Verify app remains responsive
- Check memory usage during AI extraction

##Known Test Issues

### StyledText-test.js
**Issue:** ES6 module import syntax not being transformed by Jest.
**Impact:** Low - this is a basic component test.
**Fix:** Update test to use CommonJS require or configure Babel transform.

### React Native Testing
**Issue:** Full component rendering tests require complex Jest configuration for React Native.
**Decision:** Focus on integration tests without full component rendering.
**Rationale:** Integration tests cover business logic without the complexity of React Native test environment.

## Next Steps

1. **✅ Completed:**
   - ✅ Fix all existing test failures
   - ✅ Run full test suite (98/98 passing)
   - ✅ Document test priorities
   - ✅ **Implement database operation tests**
   - ✅ **Add relation validation tests**
   - ✅ **Implement search & filter tests**

2. **Deferred (After Feature Changes):**
   - ⏸️ Story extraction flow tests (awaiting feature changes)

4. **Long-term:**
   - Add E2E tests using Detox or similar
   - Performance benchmarking tests
   - Automated visual regression testing
