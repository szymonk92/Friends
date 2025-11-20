# Remaining Tasks - To Be Implemented

## 1. Higher Quality Menu Icons 🎨

**Current Issue:**
Menu icons are basic or not visually appealing enough.

**Locations to Update:**
- Navigation tabs (People, Timeline, Network, etc.)
- Header actions
- Settings menu items
- FAB (Floating Action Button) icons

**Recommended Approach:**
1. Use `@expo/vector-icons` with better icon sets:
   - MaterialCommunityIcons (more variety)
   - Ionicons (modern, clean)
   - FontAwesome5 (professional)

2. Consider custom SVG icons for key features:
   - Story icon
   - Extraction icon
   - Network graph icon

**Example Implementation:**
```typescript
// Instead of:
<IconButton icon="account" />

// Use:
<IconButton icon="account-multiple" /> // MaterialCommunityIcons
```

**Files to Update:**
- `app/(tabs)/_layout.tsx` - Tab bar icons
- `app/settings.tsx` - Settings icons
- `components/*.tsx` - Component icons
- Header navigation buttons

**Priority:** Medium
**Estimated Time:** 1-2 hours

---

## 2. Edit Important Dates Feature 📅

**Current Issue:**
User wrote "weddinn" (typo) instead of "wedding" for an important date.
No way to edit the date label without recreating it.

**Required Functionality:**

### A. Edit Date UI
Create a new screen or dialog to edit important dates:
- Edit date label (e.g., "weddinn" → "wedding")
- Edit date value
- Edit date type/category
- Delete date

### B. Implementation Plan

**1. Add Edit Button to Person Details**
```typescript
// In person detail screen, next to important dates
<List.Item
  title={date.label}
  description={formatDate(date.date)}
  right={() => (
    <IconButton 
      icon="pencil" 
      onPress={() => handleEditDate(date.id)}
    />
  )}
/>
```

**2. Create Edit Date Dialog**
```typescript
<Dialog visible={editDateVisible}>
  <Dialog.Title>Edit Important Date</Dialog.Title>
  <Dialog.Content>
    <TextInput
      label="Label"
      value={editedLabel}
      onChangeText={setEditedLabel}
    />
    <Button onPress={showDatePicker}>
      Change Date
    </Button>
  </Dialog.Content>
  <Dialog.Actions>
    <Button onPress={handleSave}>Save</Button>
    <Button onPress={handleDelete}>Delete</Button>
  </Dialog.Actions>
</Dialog>
```

**3. Add Database Functions**
```typescript
// hooks/useImportantDates.ts (new file)
export function useUpdateImportantDate() {
  return useMutation({
    mutationFn: async ({ id, label, date }) => {
      // Update in database
    }
  });
}

export function useDeleteImportantDate() {
  return useMutation({
    mutationFn: async (id) => {
      // Delete from database
    }
  });
}
```

**4. Update Database Schema (if needed)**
Check if important dates table/relation supports updates:
- Ensure proper indexes
- Add updatedAt timestamp
- Consider soft delete

**Files to Create/Modify:**
- `hooks/useImportantDates.ts` (new)
- `app/person/[id].tsx` - Add edit buttons
- `components/ImportantDateEditor.tsx` (new dialog component)
- Database schema validation

**Priority:** High (user has immediate need)
**Estimated Time:** 2-3 hours

### Detailed Steps:

**Step 1: Create Hook** (30 min)
```bash
# Create new hook file
touch hooks/useImportantDates.ts
```

**Step 2: Add Edit UI** (1 hour)
- Add pencil icon next to each important date
- Create edit dialog with form
- Add date picker integration

**Step 3: Database Layer** (45 min)
- Add update mutation
- Add delete mutation
- Test with sample data

**Step 4: Validation** (30 min)
- Validate date format
- Validate label not empty
- Prevent duplicate labels

**Step 5: Testing** (30 min)
- Test edit flow
- Test delete with confirmation
- Test cancellation
- Verify database updates

---

## Quick Fix Workaround (Until Feature Built)

**For Immediate Relief:**

### Option A: Direct Database Edit (Advanced)
```typescript
// In dev tools or database studio
UPDATE important_dates 
SET label = 'wedding' 
WHERE label = 'weddinn' 
AND person_id = '<person_id>';
```

### Option B: Export/Import Fix
1. Export data to JSON
2. Find and replace "weddinn" with "wedding"
3. Delete person
4. Re-import fixed data

### Option C: Delete & Recreate
1. Note all details about the date
2. Delete the wrong entry
3. Add new entry with correct spelling

**Recommended:** Implement Option A as temporary measure, then build full feature.

---

## Additional UX Improvements to Consider

While implementing these features, consider:

### 1. Batch Edit
- Edit multiple dates at once
- Useful for fixing multiple typos

### 2. Date Templates
- Common date types (Birthday, Anniversary, etc.)
- Pre-filled labels

### 3. Date Reminders
- Already have birthday reminders
- Extend to other important dates

### 4. Date History
- Track changes to dates
- Audit log for corrections

---

## Priority Order

1. **Important Dates Editing** (High) - User has immediate need
2. **Menu Icons** (Medium) - Improves overall UX
3. **Additional Features** (Low) - Nice to have

---

## Implementation Checklist

### Important Dates Editing
- [ ] Create `useImportantDates` hook
- [ ] Add edit button to person details
- [ ] Create edit dialog component
- [ ] Implement update mutation
- [ ] Implement delete mutation
- [ ] Add confirmation for delete
- [ ] Add validation
- [ ] Test edit flow
- [ ] Test delete flow
- [ ] Update documentation

### Menu Icons
- [ ] Audit current icon usage
- [ ] Choose better icon set
- [ ] Update tab bar icons
- [ ] Update header icons
- [ ] Update settings icons
- [ ] Update component icons
- [ ] Test on iOS
- [ ] Test on Android
- [ ] Update screenshots

---

## Notes

**Important Dates Schema:**
Check current implementation to understand data structure:
- Where are important dates stored?
- Are they in relations table?
- Are they separate entities?
- Do they have IDs for targeting updates?

**Icon Resources:**
- [Material Community Icons](https://pictogrammers.com/library/mdi/)
- [Ionicons](https://ionic.io/ionicons)
- [Expo Vector Icons](https://icons.expo.fyi/)

---

Generated: January 19, 2025
Status: Pending Implementation
