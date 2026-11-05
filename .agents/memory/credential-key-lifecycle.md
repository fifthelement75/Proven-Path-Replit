---
name: Credential key lifecycle
description: Operational constraints for migrating legacy credential encryption and retiring keys.
---

Treat session-key rotation and customer-credential encryption-key rotation as separate operations. Preserve the original session secret in the transitional legacy secret before changing it while any legacy envelopes remain.

**Why:** Legacy ciphertext cannot identify or recover its original session secret; replacing that secret first permanently loses decryption unless it was retained securely.

**How to apply:** Follow the staged runbook in `docs/customer-api-connections.md`. A cursor reaching the end is not proof of safe retirement: stop old writers, verify from zero across every credential environment, resolve failures/conflicts, and retain historical keys for backups. Never roll back to a binary that cannot read versions already written.
