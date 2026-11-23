# HANDOFF

## Goal
Improve FriendZ (friends-mobile): fix audited bugs, make the who-knows-whom graph useful, make the UI consistent (fz design system).

## State (2026-11-23)
- `main`: PR #10, #11 (#13 Argon2id secrets + #07 screens → fz, both `done`) and #12 (Expo SDK 58 / RN 0.88.1 / React 19.3) merged. `npm run ci` green (368 tests).
- Verified on R5CY141Z1DD: new secrets (biometric) work, old XOR ones are intentionally unreadable, Settings redesign OK.
- Not hand-tested: password mode (Argon2 unlock time; tune `DEFAULT_KDF` in `lib/crypto/password-kdf.ts` if > ~3 s), graph gestures on gesture-handler 3, notifications.

## Device checklist (one build covers #07 + #13 + SDK 58)
- Secrets: biometric create/view/delete; password setup + unlock (Argon2 time on Hermes, tune `DEFAULT_KDF` in `lib/crypto/password-kdf.ts` if > ~3 s). Old XOR secrets are intentionally unreadable.
- #07 screens: Settings, Menu, Home ⋮ sheet, Review extractions (+ edit dialog), Food quiz swipe, Secrets setup.
- SDK 58 regressions: graph pan/pinch/tap, notifications, SQLite data intact, photos, sharing/export, Sentry init, status bar look (RN 0.88 dropped StatusBar `backgroundColor`/`translucent`).

## SDK 58 notes
- Clean install needed (`rm -rf node_modules package-lock.json && npm install`); `expo-symbols ~58` added explicitly (expo-router peer). Removed unused `@testing-library/*` (no tests use them; expo-router 58 wants RNTL 14 + test-renderer).
- Native: ported from a fresh `expo prebuild` in a temp dir: Gradle 9.4.1, `android.builtInKotlin=false`/`newDsl=false`, `proguard-android-optimize.txt`, `sentry.gradle.kts`. R8 (`enableMinifyInReleaseBuilds`) deliberately NOT enabled.
- Skia 2.14: `Skia.Path.Circle()` instead of `Make().addCircle`. RN 0.88: `ViewToken` not exported; FlatList header/empty must be `undefined`, not `null`.
- Still on old majors, separate task: async-storage 3, @anthropic-ai/sdk 1.x, drizzle 0.45.
- iOS not rebuilt (`ios/` is gitignored, local only).

## Key paths
- Graph: `app/network.tsx`, `components/graph/*`, `lib/graph/{layout,suggestions}.ts`
- Tokens: `lib/design/tokens.ts`; Paper theme `lib/theme.ts`; `components/{PrimaryButton,AppBar,Pill}.tsx`
- Secrets: `lib/crypto/aead.ts`, `lib/crypto/biometric-secrets.ts`

## Gotchas
- Android build (check exit code!): `export $(grep '^SENTRY_AUTH_TOKEN=' .env.local)` then `./gradlew assembleRelease` from `android/`. **Check the exit code, not a piped `tail`** (a piped failure once installed a stale APK).
- Semgrep malware-firewall proxy (`~/.gradle/gradle.properties`, mfw block) → JDK 17 gives SSL PKIX errors on Maven. Fix per build: copy JDK17 `cacerts`, `keytool -importcert` `~/.semgrep/mfw/ca.pem`, then `JAVA_TOOL_OPTIONS="-Djavax.net.ssl.trustStore=<copy> -Djavax.net.ssl.trustStorePassword=changeit"`.
- Phone copy is debug-signed: `apksigner sign --ks android/app/debug.keystore` (pass `android`, alias `androiddebugkey`) then `adb install -r`. Never uninstall.
- Graph: page ScrollView is locked while touching the graph (`onTouchingChange`); pinch zooms around the selected person if any.
- QueryClient staleTime 5 min → wrong invalidation keys = stale UI. Soft deletes only.
- Jest runs in Europe/Warsaw; d3-* mapped to UMD. Release builds silence console.log.
- Never read screenshots; user verifies visuals on device.
