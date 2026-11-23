# HANDOFF

## Goal
Improve Inner Circle (repo/dir still `Friends`/`friends-mobile`, bundle `com.friendz.app`): fix audited bugs, make the who-knows-whom graph useful, make the UI consistent (fz design system).

## State (2026-11-23)
- `main`: PR #10, #11 (#13 Argon2id secrets + #07 screens → fz, both `done`) and #12 (Expo SDK 58 / RN 0.88.1 / React 19.3) merged. `npm run ci` green (368 tests).
- Verified on R5CY141Z1DD: new secrets (biometric) work, old XOR ones are intentionally unreadable, Settings redesign OK.
- PR #13 merged: drizzle-orm 0.45, @anthropic-ai/sdk 1.x (no `temperature`). async-storage stays 2.2.0 (Expo 58 pin), R8 stays off.
- iOS rebuilt on SDK 58 (`expo prebuild --platform ios`, scheme `InnerCircle`, bundle `com.szymonk92.friendz`), installed on iPhone, launches (7-day profile).
- PR #14 merged: Secrets unlock once per visit (key in memory, locks on leave/background); verified on both phones. Argon2 ~3 s now only on entry.
- Not hand-tested: password mode (Argon2 unlock time; tune `DEFAULT_KDF` in `lib/crypto/password-kdf.ts` if > ~3 s), graph gestures on gesture-handler 3, notifications.

## Still to verify by hand (nothing blocking)
- Secrets password mode works on both phones; unlock ~3 s on iPhone (tune `DEFAULT_KDF` only if it bothers).
- Graph gestures (pan/pinch/tap) on gesture-handler 3, both phones; notifications; photos; export; status bar look.
- Done on device: biometric secrets (old XOR ones intentionally unreadable), Settings redesign, iOS launches.

## Next
- Nothing queued. Candidates: async-storage 3 (wait for Expo 59 pin), R8 minify (only with full release test), iOS profile renewal every 7 days (rebuild).

## SDK 58 notes
- Clean install needed (`rm -rf node_modules package-lock.json && npm install`); `expo-symbols ~58` added explicitly (expo-router peer). Removed unused `@testing-library/*` (no tests use them; expo-router 58 wants RNTL 14 + test-renderer).
- Native: ported from a fresh `expo prebuild` in a temp dir: Gradle 9.4.1, `android.builtInKotlin=false`/`newDsl=false`, `proguard-android-optimize.txt`, `sentry.gradle.kts`. R8 (`enableMinifyInReleaseBuilds`) deliberately NOT enabled.
- Skia 2.14: `Skia.Path.Circle()` instead of `Make().addCircle`. RN 0.88: `ViewToken` not exported; FlatList header/empty must be `undefined`, not `null`.
- Still on old majors, separate task: async-storage 3, @anthropic-ai/sdk 1.x, drizzle 0.45.
- Docs refreshed: `friends-mobile/CLAUDE.md` stack (SDK 58, Argon2/session secrets), `docs/BUILD_APK.md` local build steps, issues index.
- `ios/` is gitignored, local only; app name is Inner Circle (workspace `InnerCircle`).

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
