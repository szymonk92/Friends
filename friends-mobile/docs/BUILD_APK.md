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

## Current build (first)

- Build ID: `6693ff0f-2a17-493e-85b1-893a04077669`
- Dashboard: https://expo.dev/accounts/szymonk92/projects/friends/builds/6693ff0f-2a17-493e-85b1-893a04077669
