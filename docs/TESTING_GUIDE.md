# Testing Guide: Multi-Model AI Support

## Manual Testing Steps

### Test 1: Model Selection
**Goal:** Verify model switching works correctly

1. Open app → Settings → AI Configuration
2. Verify "Selected AI Model" section appears
3. Tap "Claude" button
4. Verify button shows as selected (contained style)
5. Tap "Gemini" button  
6. Verify button shows as selected
7. Verify model description updates

**Expected:** Smooth switching, visual feedback, description changes

---

### Test 2: Anthropic API Key Management
**Goal:** Test Claude API key storage

1. Settings → AI Configuration
2. Verify "Anthropic (Claude) API Key" section
3. Should show "Not configured" initially
4. Tap "Set Claude API Key"
5. Enter test key: `sk-ant-test123`
6. Save
7. Verify status changes to "Key is set (stored securely)"
8. Verify checkmark icon appears
9. Close app and reopen
10. Verify key is still configured

**Expected:** Key persists, status updates, checkmark shows

---

### Test 3: Gemini API Key Management
**Goal:** Test Gemini API key storage

1. Settings → AI Configuration
2. Verify "Google Gemini API Key" section
3. Should show "Not configured" initially
4. Tap "Set Gemini API Key"
5. Enter test key: `AIzaTest123`
6. Save
7. Verify status changes to "Key is set (stored securely)"
8. Verify checkmark icon appears
9. Close app and reopen
10. Verify key is still configured

**Expected:** Key persists, status updates, checkmark shows

---

### Test 4: Change API Keys
**Goal:** Verify key updates work

1. With Claude key set, tap "Change Claude Key"
2. Enter new key: `sk-ant-newkey456`
3. Save
4. Verify success message
5. Repeat for Gemini

**Expected:** Keys update successfully

---

### Test 5: Clear API Keys
**Goal:** Verify key deletion

1. With Claude key set, tap "Clear Claude Key"
2. Confirm deletion
3. Verify status changes to "Not configured"
4. Verify warning icon appears
5. Repeat for Gemini

**Expected:** Keys clear, status updates, warnings show

---

### Test 6: Active API Key Logic
**Goal:** Test automatic key selection

1. Set only Claude key
2. Select Claude model
3. Go to "Tell a Story"
4. Verify button shows "Save & Extract"
5. Go back to Settings
6. Select Gemini model (without setting key)
7. Go to "Tell a Story"
8. Verify button shows "Save Story" (no AI)
9. Go back and set Gemini key
10. Return to "Tell a Story"
11. Verify button shows "Save & Extract"

**Expected:** Button changes based on active key availability

---

### Test 7: Extraction with Claude
**Goal:** Test AI extraction with Anthropic

**Prerequisites:** Valid Anthropic API key

1. Settings → Select Claude model
2. Ensure Claude API key is set
3. Go to "Tell a Story"
4. Enter:
```
Had coffee with my friend Alex today. 
He told me he loves hiking and is planning a trip to the mountains.
```
5. Tap "Save & Extract"
6. Wait for processing
7. Verify results show:
   - New person: Alex
   - Relations: LIKES hiking, PLANS trip to mountains

**Expected:** Successful extraction with Claude

---

### Test 8: Extraction with Gemini
**Goal:** Test AI extraction with Google Gemini

**Prerequisites:** Valid Gemini API key

1. Settings → Select Gemini model
2. Ensure Gemini API key is set
3. Go to "Tell a Story"
4. Enter same story as Test 7
5. Tap "Save & Extract"
6. Wait for processing
7. Verify results show similar extractions

**Expected:** Successful extraction with Gemini

---

### Test 9: Model Switching Mid-Session
**Goal:** Verify seamless model transitions

1. Set both API keys
2. Select Claude, write and extract a story
3. Note the results
4. Settings → Switch to Gemini
5. Write and extract another story
6. Verify both extractions worked
7. Verify different models were used

**Expected:** Both extractions succeed independently

---

### Test 10: Error Handling
**Goal:** Test error scenarios

**Scenario A: No API Key**
1. Clear all API keys
2. Try to extract a story
3. Verify error message: "API Key Required"
4. Verify options to go to Settings or save without AI

**Scenario B: Invalid API Key**
1. Set invalid key: `invalid-key`
2. Try to extract
3. Verify graceful error handling
4. Verify story still saves

**Expected:** Clear error messages, graceful degradation

---

## Automated Testing

### Run Unit Tests
```bash
npm test
```

Expected output:
```
PASS  lib/ai/__tests__/ai-service.test.ts
  AI Service
    parseExtractionResponse
      ✓ should parse JSON wrapped in markdown code blocks
      ✓ should parse JSON without code blocks
      ✓ should parse JSON with markdown without json tag
      ✓ should handle complex extraction data
    callAI
      ✓ should call Anthropic when model is anthropic
      ✓ should call Gemini when model is gemini
      ✓ should throw error on invalid Anthropic response type
      ✓ should handle Gemini response without usage metadata

PASS  store/__tests__/useSettings.test.ts
  useSettings
    AI Model Selection
      ✓ should have default model as anthropic
      ✓ should set and persist selected model
      ✓ should load selected model from storage
      ✓ should ignore invalid model in storage
    Anthropic API Key
      ✓ should set and persist Anthropic API key
      ✓ should check if Anthropic API key exists
      ✓ should clear Anthropic API key
    Gemini API Key
      ✓ should set and persist Gemini API key
      ✓ should check if Gemini API key exists
      ✓ should clear Gemini API key
    Active API Key
      ✓ should return Anthropic key when model is anthropic
      ✓ should return Gemini key when model is gemini
      ✓ should check if active API key exists
      ✓ should return false if selected model has no key
    Theme Color
      ✓ should have default theme color
      ✓ should set and persist theme color
      ✓ should get theme color value

Test Suites: 2 passed, 2 total
Tests:       23 passed, 23 total
```

### Run TypeScript Check
```bash
npm run typecheck
```

Expected: No errors (except drizzle.config.ts - existing)

---

## Performance Testing

### Extraction Speed Comparison
Test both models with identical content:

**Story:**
```
Met with Sarah and Tom at the new Italian restaurant downtown. 
Sarah ordered the pasta and loved it. Tom tried the pizza.
We all agreed to come back next month.
```

**Metrics to Track:**
- Response time
- Token usage
- Extraction quality
- Number of relations found

**Create table:**
| Metric | Claude | Gemini |
|--------|--------|--------|
| Time (sec) | ? | ? |
| Tokens | ? | ? |
| Relations | ? | ? |
| Quality | ? | ? |

---

## Integration Testing

### Full User Journey
1. Fresh install/app reset
2. Open app → Settings
3. Select Gemini model
4. Add Gemini API key
5. Return to home
6. Tap "Tell a Story"
7. Write a complex story with 3 people and 5 facts
8. Extract with AI
9. Verify all relations captured
10. Go to People screen
11. Verify people created
12. Check person details
13. Verify relations displayed
14. Settings → Switch to Claude
15. Add Claude API key
16. Write another story
17. Extract
18. Compare results

**Expected:** Smooth end-to-end flow, both models work correctly

---

## Regression Testing

Verify existing features still work:
- [ ] Story creation without AI
- [ ] Manual person creation
- [ ] Manual relation creation
- [ ] Editing people
- [ ] Editing relations
- [ ] Deleting stories
- [ ] Search functionality
- [ ] Graph visualization
- [ ] Export/Import
- [ ] Theme colors
- [ ] Birthday reminders

---

## Edge Cases

### Edge Case 1: Very Long Stories
Test with 2000+ word story
- Should handle gracefully
- May hit token limits
- Should show clear error

### Edge Case 2: Empty API Key
Test entering spaces only
- Should show validation error
- Should not save

### Edge Case 3: Network Errors
Disable internet during extraction
- Should show clear error
- Story should still be saved
- Should allow retry

### Edge Case 4: Rapid Model Switching
Switch models 10 times quickly
- Should not crash
- State should remain consistent
- No memory leaks

---

## Security Testing

1. **API Key Storage**
   - Verify keys not visible in logs
   - Check AsyncStorage encryption
   - Verify keys cleared on logout

2. **Network Traffic**
   - Verify keys only sent to respective providers
   - Check for HTTPS usage
   - Verify no key leakage in errors

3. **UI Security**
   - API key input fields use secureTextEntry
   - No keys visible in screenshots
   - Sensitive data masked in alerts

---

## Checklist Before Production

- [ ] All manual tests pass
- [ ] All unit tests pass (23/23)
- [ ] TypeScript compilation clean
- [ ] No console errors
- [ ] Both models tested with real API keys
- [ ] Extraction results accurate for both models
- [ ] Performance acceptable (< 5s response time)
- [ ] Error messages clear and helpful
- [ ] UI responsive and intuitive
- [ ] Settings persist correctly
- [ ] Model switching seamless
- [ ] Documentation complete
- [ ] No breaking changes to existing features

---

## Reporting Issues

If you find a bug:
1. Note which model was selected
2. Document exact steps to reproduce
3. Include error messages if any
4. Check console logs
5. Verify API key is valid
6. Try with fresh app install

## Success Criteria

✅ Users can choose between AI models
✅ API keys managed independently
✅ Extractions work with both models
✅ No data loss when switching models
✅ Clear UI feedback for all states
✅ Comprehensive error handling
✅ Performance within acceptable range
✅ Security maintained
