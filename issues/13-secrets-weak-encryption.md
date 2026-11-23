# 13 — Secrets: repeating-key XOR encryption; deleted secrets keep ciphertext

**Status:** in-progress
**Depends on:** none
**Priority:** P1 (security) · **Effort:** M

## Goal
`lib/crypto/biometric-secrets.ts:193-231`: one 32-byte key XOR'd over every secret, no IV/MAC; DB is in Android backups (`allowBackup=true`). Password mode: 100× SHA-256 without salt, and the derived key itself is stored in SecureStore. `hooks/useSecrets.ts:193` soft-delete keeps ciphertext.

## Tasks
- AES-GCM with random nonce per secret (needs a crypto lib, e.g. react-native-quick-crypto → native rebuild)
- PBKDF2/Argon2 with salt; store a verifier, not the key
- Migrate existing secrets on unlock
- Hard-delete / null `encryptedContent` on delete; consider `allowBackup=false`

## Out of scope
—

## Progress
- [x] New secrets: XChaCha20-Poly1305, random 24-byte nonce per secret, `v2:` prefix (`lib/crypto/aead.ts`, pure-JS audited `@noble/ciphers` → no native rebuild). Tested: round-trip, nonce uniqueness, wrong key + tampering rejected.
- [x] Legacy XOR secrets still decrypt (no migration needed to open them)
- [x] Deleting a secret wipes `encryptedContent`
- [x] Android release JS bundle builds with the new dependency
- [x] Re-encrypt legacy secrets to v2 when opened
- [ ] Password mode: salted PBKDF2/Argon2, store a verifier not the key (needs a flow redesign — decision)
- [ ] `allowBackup=false` (decision: users lose Android backup of the DB)
- [ ] Verify create/view/delete secret on device
