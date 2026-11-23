# HANDOFF

## Goal
Improve FriendZ (friends-mobile): fix audited bugs, make the who-knows-whom graph useful, make the UI consistent (fz design system).

## State (2026-11-23)
PR #10 merged to `main` (2ba7bc9). `npm run ci` green, 364 tests. Build on phone R5CY141Z1DD is current.
- `done`: 01–06, 08–12, 14–23 (graph, bugs, tokens, Paper→fz theme, buttons/AppBar)
- Open: **07** (redesign old screens, L) and **13** (secrets, partial)
- Deps bumped within SDK 57 (expo 57.0.33). No SDK 58 yet.

## Open issues
- **#07**: BrainDumpSection done. Left, one screen at a time with device feedback: settings sub-components (AIConfiguration, AppearanceSettings, LanguageSelector → `SettingsRow`), review-extractions, food-quiz (4 components), person/[id] children (PartnerBadge, SocialLinksStrip, PhotoBrowser), home ⋮ Paper `Menu`, menu screen, SecretsSetup. They already get fz colours from the theme; remaining work is structural.
- **#13**: XChaCha20-Poly1305 + legacy upgrade + wipe on delete done. Needs decisions: (a) password mode: salted PBKDF2/Argon2, store a verifier not the key (flow redesign, existing password secrets must migrate); (b) `allowBackup=false` (users lose Android backup of the DB).

## Next: SDK 58 migration (own branch, not mixed with features)
Stable since 2026-09-29, now 58.0.26 → ready. Target: RN 0.86.3→0.88.1, reanimated 4.5→4.7, worklets 0.10→0.13, screens 4.26→4.30, skia 2.6→2.14, gesture-handler 2.32→**3.3 (major)**.
1. `npx expo install expo@^58 --fix`, read the SDK 58 changelog for breaking changes.
2. Gesture-handler 3: re-check `components/graph/ForceDirectedGraph.tsx` (Pan/Pinch/Tap, `runOnJS`, `onBegin/onFinalize`) and the app root.
3. Native dirs are checked in and don't follow package.json: compare `android/` with a fresh `expo prebuild` in a temp dir and port the diff; don't run `prebuild --clean` over hand-tweaks.
4. Also consider: sentry-react-native 8, async-storage 3, @anthropic-ai/sdk 1.x (separate, after SDK).
5. `npm run ci`, device check of graph gestures, secrets, notifications, SQLite.

## Key paths
- Graph: `app/network.tsx`, `components/graph/*`, `lib/graph/{layout,suggestions}.ts`
- Tokens: `lib/design/tokens.ts`; Paper theme `lib/theme.ts`; `components/{PrimaryButton,AppBar,Pill}.tsx`
- Secrets: `lib/crypto/aead.ts`, `lib/crypto/biometric-secrets.ts`

## Gotchas
- Android build: `export $(grep '^SENTRY_AUTH_TOKEN=' .env.local)` then `./gradlew assembleRelease` from `android/`. **Check the exit code, not a piped `tail`** (a piped failure once installed a stale APK).
- Semgrep malware-firewall proxy (`~/.gradle/gradle.properties`, mfw block) → JDK 17 gives SSL PKIX errors on Maven. Fix per build: copy JDK17 `cacerts`, `keytool -importcert` `~/.semgrep/mfw/ca.pem`, then `JAVA_TOOL_OPTIONS="-Djavax.net.ssl.trustStore=<copy> -Djavax.net.ssl.trustStorePassword=changeit"`.
- Phone copy is debug-signed: `apksigner sign --ks android/app/debug.keystore` (pass `android`, alias `androiddebugkey`) then `adb install -r`. Never uninstall.
- Graph: page ScrollView is locked while touching the graph (`onTouchingChange`); pinch zooms around the selected person if any.
- QueryClient staleTime 5 min → wrong invalidation keys = stale UI. Soft deletes only.
- Jest runs in Europe/Warsaw; d3-* mapped to UMD. Release builds silence console.log.
- Never read screenshots; user verifies visuals on device.
