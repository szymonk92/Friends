# FriendZ - Build and Install Guide

## 📱 Install on Your Phone (Standalone Build)

### Option 1: Android APK Build (Recommended - No Computer Needed After Build)

#### Step 1: Build the APK

```bash
# Navigate to project directory
cd friends-mobile

# Build APK locally (takes 10-20 minutes)
eas build --platform android --profile preview-device --local

# OR build on EAS cloud (faster, but requires Expo account)
eas build --platform android --profile preview-device
```

**Output:** `friendz.apk` file will be created

#### Step 2: Transfer APK to Phone

**Method A: USB Cable**
```bash
# Connect phone via USB, enable USB debugging
adb install friendz.apk
```

**Method B: Cloud Storage**
1. Upload APK to Google Drive / Dropbox / iCloud
2. Download on phone
3. Install (may need to enable "Install from Unknown Sources")

**Method C: Direct Transfer**
1. Email APK to yourself
2. Open email on phone
3. Download and install

**Method D: Local Network**
```bash
# Install a simple HTTP server
npx serve .

# On your phone's browser, navigate to:
# http://YOUR_COMPUTER_IP:3000/friendz.apk
```

#### Step 3: Install on Android Phone

1. Download the APK file
2. Open file manager
3. Tap the APK file
4. If prompted, enable "Install from Unknown Sources" in Settings
5. Tap "Install"
6. App will appear on home screen as "FriendZ"

---

### Option 2: iOS Build (Requires Apple Developer Account)

#### For Physical iPhone:

```bash
# Build for iOS device
eas build --platform ios --profile preview-device
```

**Requirements:**
- Apple Developer Account ($99/year)
- Provisioning profile
- Signing certificate

**Installation:**
- Download IPA file
- Install via Apple Configurator or TestFlight

---

### Option 3: Development Build (Computer Required)

#### Android Development:

```bash
# Start Expo development server
npm start

# Scan QR code with Expo Go app
# OR press 'a' for Android emulator
```

#### iOS Development:

```bash
# Start Expo development server
npm start

# Scan QR code with Expo Go app
# OR press 'i' for iOS simulator (macOS only)
```

**Limitation:** Requires computer to stay connected and running Expo server.

---

## 🚀 Recommended Workflow for Standalone Installation

### For Android Users (Easiest):

1. **Build APK (one-time, 10-20 min):**
   ```bash
   eas build --platform android --profile preview-device --local
   ```

2. **Transfer to phone** (choose easiest method):
   - USB: `adb install friendz.apk`
   - Cloud: Upload to Drive, download on phone
   - Email: Send APK to yourself

3. **Install and use** - no computer needed!

---

## 🛠️ Build Profiles Explained

| Profile | Purpose | Output | Installation |
|---------|---------|--------|--------------|
| `local` | Local development build | APK | Direct install |
| `preview-device` | Testing on real devices | APK/IPA | Direct install |
| `development` | Dev with debugging | Development build | Expo Go |
| `production` | App Store release | AAB/IPA | Store submission |

---

## 📦 Build Configuration (eas.json)

### Local Build (No EAS Cloud):
```json
{
  "build": {
    "local": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Preview Build (For Testing):
```json
{
  "build": {
    "preview-device": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

---

## 🔧 Prerequisites

### For Android APK Build:

**Option A: Local Build**
- Android Studio (for SDK)
- Java JDK 17+
- 20GB free disk space
- 10-20 minutes build time

**Option B: EAS Cloud Build**
- Expo account (free)
- 5-10 minutes build time
- No local requirements

### For iOS Build:

- Apple Developer Account ($99/year)
- macOS (for Xcode)
- Xcode installed
- Signing certificates

---

## 📲 Installation Methods Compared

| Method | Android | iOS | Requires Computer | Difficulty |
|--------|---------|-----|-------------------|------------|
| **APK Direct** | ✅ | ❌ | Only for build | ⭐ Easy |
| **TestFlight** | ❌ | ✅ | Only for build | ⭐⭐ Medium |
| **USB/ADB** | ✅ | ❌ | For install only | ⭐⭐ Medium |
| **Expo Go** | ✅ | ✅ | Always needed | ⭐ Easy |
| **App Store** | ✅ | ✅ | Only for build | ⭐⭐⭐ Complex |

---

## 🎯 Quick Start: Install Without Computer Server

### For Android (Easiest Method):

```bash
# 1. Build APK (do this once)
cd friends-mobile
eas build --platform android --profile preview-device

# 2. Wait for build (5-10 minutes)
# EAS will provide a download link

# 3. Open link on your phone
# Download APK directly

# 4. Install APK
# Enable "Install from Unknown Sources" if prompted

# 5. Done! App works offline, no computer needed
```

### Why This is Better Than Expo Go:

| Feature | Expo Go | Standalone APK |
|---------|---------|----------------|
| Computer needed | ✅ Always | ❌ Never |
| Internet needed | ✅ Yes | ❌ No (after install) |
| Native features | ⚠️ Limited | ✅ Full access |
| Performance | ⚠️ Slower | ✅ Native speed |
| Updates | 🔄 Auto | 📦 Manual |

---

## 🔐 Enable "Install from Unknown Sources" (Android)

### Android 8.0+:
1. Settings → Apps → Special app access
2. Install unknown apps
3. Select browser/file manager
4. Toggle "Allow from this source"

### Android 7.0 and below:
1. Settings → Security
2. Toggle "Unknown sources"

---

## 🆘 Troubleshooting

### Build Fails:
```bash
# Clear cache and retry
npm run prebuild --clean
eas build --platform android --profile preview-device --clear-cache
```

### APK Won't Install:
- Enable "Unknown Sources"
- Check storage space (need 100MB+)
- Try different file manager
- Verify APK isn't corrupted (re-download)

### App Crashes on Launch:
- Check device OS version (need Android 6.0+)
- Clear app data
- Reinstall APK
- Check logs: `adb logcat`

---

## 📝 Notes

- **APK Size:** ~50-80MB
- **First Build:** 10-20 minutes
- **Subsequent Builds:** 5-10 minutes
- **Android Version:** Requires Android 6.0+ (API 23+)
- **iOS Version:** Requires iOS 13.4+

---

## 🎨 App Info

- **Name:** FriendZ
- **Package ID:** `com.friendz` (configurable in app.json)
- **Version:** 1.0.0
- **Icon:** Custom logo from logo.svg
- **Splash:** White background with centered logo

---

## 🚀 Production Release

When ready for app stores:

```bash
# Android (Google Play)
eas build --platform android --profile production

# iOS (App Store)
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## 📚 Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Local Builds Guide](https://docs.expo.dev/build-reference/local-builds/)
- [Android APK Distribution](https://docs.expo.dev/build/internal-distribution/)
- [iOS TestFlight Guide](https://docs.expo.dev/build/internal-distribution/#22-testflight)
