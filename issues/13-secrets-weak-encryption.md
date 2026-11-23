# 13 — Secrets: repeating-key XOR encryption; deleted secrets keep ciphertext

**Status:** todo
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
