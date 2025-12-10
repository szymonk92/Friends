# 🚀 Quick Build & Install - FriendZ

## For Android (No Computer Server Needed!)

### Method 1: EAS Cloud Build (Fastest - Recommended)

```bash
# 1. Install EAS CLI (if not installed)
npm install -g eas-cli

# 2. Login to Expo (create free account at expo.dev)
eas login

# 3. Build APK (5-10 minutes)
cd friends-mobile
eas build --platform android --profile preview-device

# 4. Download APK from link provided
# 5. Send APK to your phone (email, Drive, etc.)
# 6. Install on phone - Done! ✅
```

### Method 2: Local Build (No Cloud Account Needed)

```bash
# 1. Build locally (takes 15-20 minutes first time)
cd friends-mobile
eas build --platform android --profile local --local

# 2. APK will be in the build folder
# 3. Transfer to phone and install
```

---

## 📲 Installing the APK on Your Phone

### Step 1: Transfer APK

**Option A - Google Drive:**
1. Upload APK to Google Drive
2. Open Drive on phone
3. Download APK

**Option B - Email:**
1. Email APK to yourself
2. Open email on phone
3. Download attachment

**Option C - USB Cable:**
```bash
# Connect phone via USB
adb install friendz.apk
```

### Step 2: Enable Installation

1. Open downloaded APK
2. If blocked, tap "Settings"
3. Enable "Install from this source"
4. Go back and tap "Install"

### Step 3: Launch

- App appears as "FriendZ" on home screen
- No computer needed to run!
- Works offline!

---

## 🎯 What You Get

✅ **Standalone App** - No computer needed after install  
✅ **Offline Access** - Works without internet  
✅ **Native Performance** - Full speed  
✅ **All Features** - Complete functionality  
✅ **Custom Icon** - FriendZ logo  
✅ **Professional** - Just like Play Store apps  

---

## 🔥 Super Quick Method

```bash
# One command to rule them all!
npx eas-cli build --platform android --profile preview-device

# Wait 10 minutes, download APK, install - DONE!
```

---

## 💡 Tips

- **First build:** Takes longer (10-20 min)
- **Subsequent builds:** Much faster (5-10 min)
- **APK size:** ~50-80MB
- **Android version:** Need 6.0+ (most phones since 2015)
- **No cost:** Free with Expo account

---

## 🆘 Need Help?

**Build failed?**
```bash
eas build --platform android --profile preview-device --clear-cache
```

**Can't install APK?**
- Enable "Unknown Sources" in phone settings
- Check you have 100MB+ free space
- Try downloading again (might be corrupted)

**App won't open?**
- Check Android version (need 6.0+)
- Restart phone
- Reinstall app

---

## 📱 For iOS Users

iOS requires Apple Developer Account ($99/year):

```bash
# Build for iOS
eas build --platform ios --profile preview-device

# Install via TestFlight or Apple Configurator
```

Or use Expo Go for development (free but requires computer).

---

## 🎨 Current Configuration

- **App Name:** FriendZ
- **Package:** com.friendz.app
- **Version:** 1.0.0
- **Icon:** Custom logo (1024x1024)
- **Splash:** Logo on white background

---

## 📚 Full Documentation

See `BUILD_GUIDE.md` for detailed instructions and troubleshooting.
