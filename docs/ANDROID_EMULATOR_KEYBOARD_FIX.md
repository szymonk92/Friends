# Android Emulator Keyboard Issues - @ Symbol Fix

**Problem**: Cannot type `@` symbol in Android emulator text inputs

---

## Solution 1: Use the @ Button (Implemented)

We added a **purple @ button** next to the story input field. Just tap it to insert @ at cursor position.

**Location**: Story input screen, top-right of text field

---

## Solution 2: Enable Virtual Keyboard

### Steps:
1. Open Android emulator
2. Go to **Settings** → **System** → **Languages & Input** → **On-screen keyboard**
3. Enable **Gboard** or any virtual keyboard
4. When typing, tap the keyboard icon in bottom-right to show virtual keyboard
5. Type `@` from the virtual keyboard

---

## Solution 3: Fix Physical Keyboard Mapping

### For macOS/Linux:
1. In emulator settings: **Extended Controls** (three dots on toolbar)
2. Go to **Settings** → **Advanced** → **Keyboard**
3. Try toggling **"Enable clipboard sharing"**
4. Restart emulator

### For Windows:
1. Check if your keyboard layout is set correctly
2. Try: `Shift + 2` (US layout) or `AltGr + Q` (European)

---

## Solution 4: AVD Settings

### Edit AVD Configuration:
1. In Android Studio: **Tools** → **AVD Manager**
2. Click **Edit** (pencil icon) on your emulator
3. Click **Show Advanced Settings**
4. Under **Keyboard**:
   - Enable **"Enable keyboard input"**
   - Try toggling **"Hardware keyboard present"**
5. Save and restart emulator

---

## Solution 5: Use Hardware Keyboard with Correct Layout

### Check Keyboard Layout:
```bash
# On emulator, check current layout:
adb shell settings get secure default_input_method

# Switch to Gboard:
adb shell ime enable com.google.android.inputmethod.latin/.LatinIME
adb shell ime set com.google.android.inputmethod.latin/.LatinIME
```

---

## Solution 6: Copy-Paste Workaround

If all else fails:
1. Copy this: `@`
2. Paste it in the text field
3. Continue typing

---

## Solution 7: Emulator Command-Line Flag

### When starting emulator:
```bash
emulator -avd YOUR_AVD_NAME -prop ro.config.hw.keyboard=true
```

---

## Common Key Combinations by Keyboard Layout

| Layout | @ Symbol Combination |
|--------|---------------------|
| US | `Shift + 2` |
| UK | `Shift + '` |
| German | `AltGr + Q` |
| French | `AltGr + à` |
| Spanish | `AltGr + 2` |
| Nordic | `AltGr + 2` |

---

## Testing Your Keyboard

Try typing these in the emulator:
- `@` - At symbol
- `#` - Hash
- `$` - Dollar
- `%` - Percent

If none work, your physical keyboard mapping is broken. Use virtual keyboard instead.

---

## For Developers: Code Solution

We implemented a fallback **@ button** in `MentionTextInput.tsx`:

```tsx
<TouchableOpacity style={styles.atButton} onPress={insertAtSymbol}>
  <Text style={styles.atButtonText}>@</Text>
</TouchableOpacity>
```

This inserts `@` at the cursor position programmatically.

---

## Why This Happens

### Root Causes:
1. **Emulator keyboard passthrough** - The emulator tries to use your physical keyboard but doesn't map all symbols correctly
2. **Different keyboard layouts** - Your physical keyboard layout might not match the emulator's expected layout
3. **Host OS interference** - macOS/Windows/Linux intercept some key combinations
4. **Clipboard sync issues** - Some emulator versions have clipboard sync problems

### Real Devices:
This issue **only affects emulators**. On real Android devices, the @ symbol works normally through the virtual keyboard.

---

## Recommended Solution

**For Development**: Use the @ button we added
**For Testing**: Enable virtual keyboard (Solution 2)
**For Production**: No issue - real devices work fine

---

## Additional Features We Can Add

If the @ button isn't enough, we can also add:

1. **Quick mention chips**: Row of recent people to tap
2. **Floating action button**: Always-visible @ button
3. **Smart autocomplete**: Shows people as you type
4. **Gesture**: Long-press spacebar to insert @

Let me know if you want any of these!

---

**Last Updated**: November 17, 2025
