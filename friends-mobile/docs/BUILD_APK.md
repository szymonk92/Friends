# Building an Android APK

## Prerequisites

- Logged into EAS: `npx eas whoami`  
  If not: `npx eas login`
- EAS CLI: already in `node_modules` via `npx eas`

## Profiles in `eas.json`

| Profile | Use case | Output |
|---|---|---|
| `preview` | Internal testing on real device | APK |
| `development` | Dev client (Expo Go replacement) | APK (debug) |
| `production` | Play Store submission | APK / AAB |
| `local` | Build on this Mac (no EAS cloud) | APK (release) |

## Build an APK for device testing

```bash
cd friends-mobile
npx eas build --profile preview --platform android
```

- Build runs on EAS cloud (~10–20 min on free tier, ~5 min on paid)
- When done, EAS prints a download URL and QR code
- Download the `.apk` and install via `adb install app.apk` or side-load from device

## Check build status / download

```bash
npx eas build:list --platform android --limit 5
```

Or open the dashboard: https://expo.dev/accounts/szymonk92/projects/friends/builds

## Build locally (no EAS cloud, requires Android SDK)

```bash
cd friends-mobile
set -a && source .env.local && set +a
cd android && ./gradlew assembleRelease
```

- `set -a / set +a` exports all `.env.local` vars so Sentry CLI gets `SENTRY_AUTH_TOKEN`
- Output: `android/app/build/outputs/apk/release/app-release.apk`
- First build: ~5–10 min (compiles Skia + native modules). Subsequent builds: ~1–2 min (cached).
- Requires `ANDROID_HOME` pointing to the Android SDK (already set on this machine).

## Install on device via ADB

```bash
adb install path/to/build.apk
# Force reinstall (keeps data):
adb install -r path/to/build.apk
```

## Keystore

The Android signing keystore is stored remotely on EAS servers (`szymonk92` account).  
To view/manage: `npx eas credentials`

## Local builds (SDK 58)

**Android** (from `android/`): `export $(grep '^SENTRY_AUTH_TOKEN=' ../.env.local)` then `./gradlew assembleRelease`. Check Gradle's own exit code, not a piped `tail`. The phone copy is debug-signed: `apksigner sign --ks android/app/debug.keystore --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android --out signed.apk app-release.apk`, then `adb install -r signed.apk` (never uninstall). If the Semgrep malware-firewall proxy breaks JDK 17 TLS, point `JAVA_TOOL_OPTIONS` at a truststore copy that includes `~/.semgrep/mfw/ca.pem`. R8 minify is off on purpose. Native `android/` is checked in and not synced with `package.json`; compare with `expo prebuild` in a temp dir after SDK bumps.

**iPhone** (free personal team): `ios/` is gitignored; regenerate with `npx expo prebuild --platform ios --no-install` + `pod install`. From `ios/`: `SENTRY_DISABLE_AUTO_UPLOAD=true xcodebuild -workspace InnerCircle.xcworkspace -scheme InnerCircle -configuration Release -destination 'id=<UDID>' -derivedDataPath build/dd -allowProvisioningUpdates DEVELOPMENT_TEAM=<team> CODE_SIGN_STYLE=Automatic CODE_SIGN_ENTITLEMENTS=<empty-dict .entitlements> PRODUCT_BUNDLE_IDENTIFIER=com.szymonk92.friendz build`, then `xcrun devicectl device install app --device <UDID> build/dd/Build/Products/Release-iphoneos/InnerCircle.app`. First launch needs the developer profile trusted on the phone; profile expires after 7 days.
