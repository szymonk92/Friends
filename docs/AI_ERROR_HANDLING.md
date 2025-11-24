# AI Error Handling & Retry Strategy

## Overview

The AI service now includes comprehensive error handling, automatic retries, and user-friendly error messages for both Anthropic Claude and Google Gemini models.

## Features

### 1. Automatic Retry with Exponential Backoff

**Retry Configuration:**
- Maximum retries: 3 attempts
- Initial delay: 1 second
- Maximum delay: 10 seconds
- Exponential backoff: 1s → 2s → 4s → 8s
- Jitter: Random 0-500ms added to prevent thundering herd

**Retryable Errors:**
- ✅ Rate limits (429)
- ✅ Network errors
- ✅ Timeouts
- ✅ Server errors (500-504)
- ✅ Empty responses

**Non-Retryable Errors:**
- ❌ Invalid API key (401/403)
- ❌ Quota exceeded (billing issue)
- ❌ Content policy violations
- ❌ Invalid response format (non-JSON)

### 2. Error Classification

All errors are classified into specific types for appropriate handling:

| Error Type | Retryable | User Action |
|------------|-----------|-------------|
| `RATE_LIMIT` | Yes | Wait and retry automatically |
| `QUOTA_EXCEEDED` | No | Add API credits |
| `INVALID_API_KEY` | No | Update API key in Settings |
| `NETWORK_ERROR` | Yes | Check internet connection |
| `TIMEOUT` | Yes | Try shorter story or retry |
| `INVALID_RESPONSE` | Maybe | Retry, contact support if persists |
| `CONTENT_POLICY` | No | Rephrase story content |
| `SERVER_ERROR` | Yes | Wait for service recovery |
| `UNKNOWN` | No | Generic fallback |

### 3. User-Friendly Error Messages

Instead of technical errors, users see:

**Before:**
```
Error: [GoogleGenerativeAI Error]: Error fetching from 
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent: 
[429] Resource exhausted...
```

**After:**
```
Gemini rate limit reached. Please wait a moment and try again.

Tip: Try again in a few minutes, or consider upgrading 
your API plan for higher limits.
```

## Common Scenarios

### Scenario 1: Rate Limit (429)

**What Happens:**
1. Request hits rate limit
2. Error detected as `RATE_LIMIT`
3. Automatic retry after 1 second
4. If still limited, retry after 2 seconds
5. If still limited, retry after 4 seconds
6. After 3 failures, show user-friendly message

**User Experience:**
- Short delays: User sees "Processing..." for a bit longer
- Persistent limits: Clear message to wait or upgrade

### Scenario 2: Network Error

**What Happens:**
1. Network request fails
2. Error detected as `NETWORK_ERROR`
3. Automatic retry with backoff
4. Up to 3 attempts
5. If all fail, show connectivity message

**User Experience:**
- Transient issues: Handled automatically
- Persistent issues: Clear message to check connection

### Scenario 3: Invalid API Key

**What Happens:**
1. API rejects key (401/403)
2. Error detected as `INVALID_API_KEY`
3. No retry (won't help)
4. Immediate user-friendly message

**User Experience:**
- Clear actionable message
- Direct link to Settings
- Explanation of what's wrong

### Scenario 4: Quota Exceeded

**What Happens:**
1. API returns quota exceeded
2. Error detected as `QUOTA_EXCEEDED`
3. No retry (need credits)
4. Immediate message with action

**User Experience:**
- Clear explanation of quota
- Action: Add credits or wait for reset
- Link to API provider's billing

### Scenario 5: Server Error (500)

**What Happens:**
1. AI provider has server issue
2. Error detected as `SERVER_ERROR`
3. Automatic retry (might be temporary)
4. Exponential backoff
5. Message if persists

**User Experience:**
- Short outages: Handled automatically
- Extended outages: Clear message that it's not their fault

## Implementation Details

### Error Detection

```typescript
function classifyError(error: any, model: AIModel): AIError {
  // Checks error message for specific patterns:
  // - "429" or "rate limit" → RATE_LIMIT
  // - "quota" or "billing" → QUOTA_EXCEEDED
  // - "401" or "unauthorized" → INVALID_API_KEY
  // - "network" or "fetch" → NETWORK_ERROR
  // - "timeout" → TIMEOUT
  // - "500-504" → SERVER_ERROR
  // etc.
}
```

### Retry Logic

```typescript
export async function callAI(
  config: AIServiceConfig,
  prompt: string,
  retryCount: number = 0
): Promise<Response> {
  try {
    return await callModel(config, prompt);
  } catch (error) {
    const aiError = classifyError(error, config.model);
    
    if (aiError.retryable && retryCount < MAX_RETRIES) {
      const delay = calculateRetryDelay(retryCount, aiError.retryAfter);
      await sleep(delay);
      return callAI(config, prompt, retryCount + 1);
    }
    
    throw createUserFriendlyError(aiError, config.model);
  }
}
```

### Exponential Backoff

```typescript
function calculateRetryDelay(retryCount: number, retryAfter?: number): number {
  if (retryAfter) return retryAfter; // Honor retry-after header
  
  const exponential = INITIAL_DELAY * Math.pow(2, retryCount);
  const jitter = Math.random() * 500;
  
  return Math.min(exponential + jitter, MAX_DELAY);
}
```

## Rate Limiting (TODO)

**Current State:**
No rate limiting implemented yet. Users are limited only by their API provider's limits.

**Planned Implementation:**

### Per-User Rate Limiting
```typescript
// Track requests per user
interface RateLimitInfo {
  userId: string;
  requestCount: number;
  windowStart: Date;
  windowDuration: number; // ms
}

// Example limits:
const LIMITS = {
  free: { requests: 10, window: 3600000 }, // 10/hour
  premium: { requests: 100, window: 3600000 }, // 100/hour
};
```

### Storage Options
1. **In-Memory** (simple, resets on restart)
2. **AsyncStorage** (persistent, local only)
3. **Database** (persistent, queryable)
4. **Redis** (if backend exists, best for distributed)

### UI Indicators
```typescript
// Show remaining quota
<Text>Requests remaining: {remainingRequests}/{totalQuota}</Text>

// Show reset time
<Text>Quota resets in: {timeUntilReset}</Text>

// Queue indicator
<Text>Request queued. Position: {queuePosition}</Text>
```

### Queue System
When limit reached:
- Queue requests instead of rejecting
- Process when quota available
- Show queue position to user
- Allow cancellation

## Error Recovery Strategies

### Strategy 1: Graceful Degradation
```typescript
// If AI fails, still save the story
try {
  await extractWithAI(story);
} catch (error) {
  // Save story without AI extraction
  await saveStory(story);
  // User can manually extract later
  showErrorWithRetryOption(error);
}
```

### Strategy 2: Fallback Model
```typescript
// Try primary model, fall back to secondary
try {
  return await callPrimaryModel(story);
} catch (error) {
  if (shouldFallback(error)) {
    return await callFallbackModel(story);
  }
  throw error;
}
```

### Strategy 3: Partial Results
```typescript
// If extraction partially succeeds, save what we got
try {
  const result = await extractAll(story);
  return result;
} catch (error) {
  // Check if we got any partial data before error
  if (hasPartialResults(error)) {
    savePartialResults(error.partialData);
    throw enhancedError('Partial extraction saved');
  }
  throw error;
}
```

## Testing Error Scenarios

### Manual Testing

**Test Rate Limit:**
```typescript
// Make many requests quickly
for (let i = 0; i < 20; i++) {
  await extractRelations(story);
}
// Should see rate limit handling
```

**Test Invalid Key:**
```typescript
// Use wrong API key
config.apiKey = 'invalid-key-12345';
await extractRelations(story);
// Should show clear API key error
```

**Test Network Error:**
```typescript
// Turn off WiFi/data
// Try extraction
// Should show network error with retry
```

**Test Timeout:**
```typescript
// Use very long story (10,000+ words)
await extractRelations(veryLongStory);
// Should handle timeout gracefully
```

### Automated Testing

```typescript
// Mock different error scenarios
describe('AI Error Handling', () => {
  it('retries on rate limit', async () => {
    mockAPI.mockRejectedValueOnce(new RateLimitError());
    mockAPI.mockResolvedValueOnce(validResponse);
    
    const result = await callAI(config, prompt);
    expect(result).toBeDefined();
    expect(mockAPI).toHaveBeenCalledTimes(2);
  });
  
  it('does not retry on invalid key', async () => {
    mockAPI.mockRejectedValue(new AuthError());
    
    await expect(callAI(config, prompt)).rejects.toThrow('Invalid');
    expect(mockAPI).toHaveBeenCalledTimes(1);
  });
});
```

## Monitoring & Logging

### What to Log

**Success:**
```typescript
console.log('[AI Service] Success', {
  model: config.model,
  tokensUsed: result.tokensUsed,
  duration: Date.now() - startTime,
});
```

**Retry:**
```typescript
console.log('[AI Service] Retry', {
  model: config.model,
  attempt: retryCount + 1,
  errorType: aiError.type,
  delay: calculatedDelay,
});
```

**Failure:**
```typescript
console.error('[AI Service] Failed', {
  model: config.model,
  errorType: aiError.type,
  retries: retryCount,
  message: error.message,
});
```

### Metrics to Track

1. **Success Rate**
   - Successful extractions / Total attempts
   - Track per model

2. **Retry Rate**
   - Requests requiring retries / Total requests
   - Average retries per success

3. **Error Distribution**
   - Count by error type
   - Identify patterns

4. **Response Time**
   - Average, p50, p95, p99
   - Include retry delays

5. **Token Usage**
   - Per user, per model
   - Cost tracking

## Future Enhancements

### 1. Smart Model Selection
```typescript
// Automatically choose best model based on:
// - Current rate limits
// - Story complexity
// - Cost optimization
// - Historical success rate
```

### 2. Request Queuing
```typescript
// Queue requests when limits hit
// Process in order when quota available
// Priority queue for premium users
```

### 3. Caching
```typescript
// Cache similar extractions
// Avoid duplicate API calls
// Reduce costs and improve speed
```

### 4. Circuit Breaker
```typescript
// If model consistently fails
// Temporarily stop using it
// Auto-recover after cooldown
```

### 5. Health Checks
```typescript
// Periodic ping to AI providers
// Track uptime
// Proactive user warnings
```

## Best Practices

1. **Always Provide Fallback**
   - Never lose user data due to AI failure
   - Save story even if extraction fails

2. **Clear Communication**
   - Tell user what happened
   - Provide actionable next steps
   - Show progress during retries

3. **Respect Rate Limits**
   - Implement client-side rate limiting
   - Don't hammer APIs unnecessarily
   - Use exponential backoff

4. **Log Everything**
   - Track all errors for analysis
   - Monitor trends
   - Identify systemic issues

5. **Test Failure Modes**
   - Regularly test error scenarios
   - Ensure error messages are clear
   - Verify retry logic works

## Summary

✅ **Automatic retries** for transient failures
✅ **Smart error classification** for appropriate handling
✅ **User-friendly messages** instead of technical jargon
✅ **Exponential backoff** to respect rate limits
✅ **Graceful degradation** - never lose user data
✅ **Clear action items** for users
✅ **Comprehensive logging** for debugging

**Result:** Robust, user-friendly AI integration that handles failures gracefully! 🎉

---

**Created:** January 19, 2025
**Last Updated:** January 19, 2025
**Status:** Implemented & Tested
