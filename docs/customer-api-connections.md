# Customer API connections: Otter.ai and iCIMS

These adapters use credentials provided by the signed-in company's admin, not a shared developer account. Both currently expose **read-only** operations through Settings → Data exchange. Authorizing a tool does not start automatic imports or scheduled synchronization.

## Otter.ai

- Requires an Enterprise workspace with Public API access.
- In Otter, open Integrations → Developer and create a dedicated API key.
- In Proven Path, select Otter.ai, choose Authorize, and enter that key in the secure connection dialog.
- Connecting checks `GET https://api.otter.ai/v1/conversations?limit=1` and requires the documented response shape. Failed credentials, insufficient permissions, unsupported accounts, and unexpected responses are not saved.
- Supported operations: read conversations (20 per page, with a next-page cursor), and read an individual conversation's details.
- No scraping, unofficial login automation, transcript import pipeline, audio uploads, or write-back is enabled by this adapter.

Official documentation: https://help.otter.ai/hc/en-us/articles/36130822688279-Otter-ai-Public-API

## iCIMS

- Requires API integration access provisioned for the customer's iCIMS platform, its numeric customer ID, and an integration username/password authorized for Basic authentication.
- The account needs Integration User group access to Search and read access to the appropriate Profiles. Developer-community or ordinary portal login credentials are not API credentials.
- API provisioning, integration licensing, account permissions, and any applicable IP restrictions must be agreed with iCIMS. Being able to sign in to a developer portal is not sufficient.
- This adapter supports **provisioned Basic-auth API integration accounts**, not OAuth-only accounts or Prime/JWT-specific integrations.
- Connecting performs a customer-scoped Search API read, requesting person ID 1 only. An empty search result is valid; unauthorized, forbidden, or unsupported responses are not saved.
- Supported operations: read a person profile by ID; read a job profile by ID for reference. This does not create candidates, assign candidate roles, modify recruiting workflows, or claim iCIMS Marketplace certification.
- Person import identity includes the iCIMS customer ID to prevent numeric profile ID collisions after switching customer platforms. Job responses are not presented as candidate imports.

Official documentation:
- https://developer-community.icims.com/getting-started/integrating-icims
- https://developer-community.icims.com/applications/applicant-tracking/search-api
- https://developer-community.icims.com/applications/applicant-tracking/profiles-api

## Security and lifecycle

- An additive, idempotent startup migration creates the credential table on existing databases before the API accepts requests. Startup fails rather than serving traffic if this migration cannot run. Concurrent server starts serialize the migration with a database advisory lock. This does not depend on a developer running `drizzle-kit push`.

- Credential submission requires company-admin authorization, Team entitlement, and explicit consent.
- Credentials are AES-256-GCM encrypted on the server, authenticated to the company, provider, environment, and connection. No plaintext credentials or encrypted envelopes appear in connection list responses, action history, URLs, or analytics.
- New credentials use a dedicated versioned keyring, independent of the session secret, with independently generated nonces and domain-separated derived keys. The authenticated `v2` header contains the active key ID, never the key itself. Old key IDs remain decrypt-only after the active ID changes.
- Legacy `v1` credentials remain readable using the original session secret during migration. Capture it as `CUSTOMER_CREDENTIAL_LEGACY_SECRET` before rotating `SESSION_SECRET`; without that capture, legacy reads use the current `SESSION_SECRET` for compatibility. New credential authorization is disabled until a valid dedicated keyring is configured. There is no fallback to session-derived encryption for new writes.
- Development and production credentials are separate. Authorizing an account in development does not authorize production.
- Requests use fixed HTTPS vendor hosts, do not follow redirects, have timeouts and bounded responses, and never expose upstream error bodies.
- Connection health is checked when loading status and before exchange. Revoked credentials require reauthorization.
- Disconnect deletes the connection and encrypted credential, including already-revoked credentials. Imported local records remain.
- Neither adapter has a documented endpoint to revoke its API credential globally. **Revoke or rotate it in the provider's own administration UI** to invalidate it everywhere. Local disconnect must not be described as global vendor revocation.

Real customer-account access still depends on the customer supplying provisioned credentials. Automated tests simulate the documented API responses; no live customer credentials were used for implementation verification.

## Operator runbook: migrate and rotate encryption keys

Configure each deployment through its secure secret manager; never paste keys into chat, source files, command arguments, logs or connection metadata.

- `CUSTOMER_CREDENTIAL_KEYS` (secret): a JSON object mapping permanent key IDs to independently generated **32 random bytes encoded as canonical standard base64**. Use a cryptographic generator and transfer output directly to the secret manager. IDs contain 1–64 letters, digits, `_` or `-`. Do not reuse an ID with different key material.
- `CUSTOMER_CREDENTIAL_ACTIVE_KEY_ID` (non-secret): the exact key ID used for all new writes. It must exist in the keyring. Malformed JSON, invalid key lengths/IDs or an absent active key fail closed.
- `CUSTOMER_CREDENTIAL_LEGACY_SECRET` (secret, transitional): the exact original `SESSION_SECRET` that encrypted existing `v1` envelopes. Preserve this before any session-secret rotation. An empty value disables legacy decryption.

No schema change is needed: version and key ID are stored inside the existing encrypted envelope, separate from public connection metadata. Missing keys produce a generic configuration error, not a vendor-revocation diagnosis; corrupted ciphertext fails authentication. No decryption attempts try arbitrary keys.

### Initial legacy migration

1. Back up the database and securely retain the original session secret. Install the dedicated keyring and active ID and capture the legacy secret. Restart all API instances. Existing `v1` rows continue to work; new/reconnected credentials are written as `v2`.
2. Build the API package with `pnpm --filter @workspace/api-server run build` (the managed API workflow also builds it). Run the following command in the target deployment's secure administrative environment, using that deployment's database and secrets. The environment flag selects credential rows; **it does not select a database or deployment**.

   `pnpm --filter @workspace/api-server run credentials:rotate --environment production`

   The default is a read-only dry run. It authenticates every scanned envelope, including already-current ones, and reports only counts and a numeric cursor. Development rows are excluded. Use `--environment development` for development rows.
3. Apply bounded batches explicitly:

   `pnpm --filter @workspace/api-server run credentials:rotate --environment production --apply --batch-size 100 --max-rows 1000`

   Optionally restrict to one company with `--company-id N`. `--batch-size` is limited to 1–1000; `--max-rows` caps total work. Continue with `--after-connection-id N` using the returned `lastConnectionId`, or restart from zero safely. Already-current rows are authenticated but not rewritten. `exhausted: false` means another batch is needed (an exactly full final batch needs an additional empty pass). Database interruption may leave a partial migration; completed row updates are atomic and retries are safe.
4. `failed` rows are unchanged and `conflicts` mean a row changed or was deleted concurrently. A batch with either exits nonzero. Resolve missing keys/tampering and rerun **from zero** so failures before a saved cursor are retried. Never discard an old key merely because a cursor reached the end.
5. Stop all old-version writers and run a complete dry-run pass from zero across **every credential environment in that database**. Require zero failures, conflicts and pending rows, with all batches exhausted. Only then remove the legacy secret from active configuration and rotate the session secret independently. Removing the legacy override restores the compatibility fallback to the current session secret; set it empty if legacy reads must be explicitly disabled.

### Subsequent staged rotations

1. Add a fresh ID/key to the keyring on **every** API instance while keeping the old active ID. Restart and verify all instances can read both IDs before any writer switches.
2. Change the active ID on all writers and restart. Keep all older key material present. Mixed old/new rows remain readable; keyring changes do not call vendor APIs or change connection metadata, health, import identity or sync configuration.
3. Run dry-run and apply batches as above. Updates compare company/provider/environment/connection **and the original envelope**, so rotation never overwrites concurrent customer reconnection or resurrects disconnected credentials. Concurrent runs are safe but may report conflicts.
4. Once all old writers are stopped and a full zero-pending verification succeeds in every environment, check each retained database backup before retiring any key. Restore the snapshot into an isolated database using its normal recovery process, then run the manifest command against that restored database:

   `pnpm --filter @workspace/api-server run credentials:backup-manifest -- --snapshot-id backup-2026-11-07 --retention-expires-at 2026-12-07T00:00:00Z`

   `--snapshot-id` must be an opaque, non-secret identifier from the backup system. `--retention-expires-at` must be that snapshot's actual retention expiry in ISO-8601 format. The command reads credential envelopes only to classify their version and key ID; it prints aggregate counts, key IDs, a legacy-v1 presence flag, and the supplied retention metadata. It never prints company or connection IDs, credentials, ciphertext, or key material. It classifies malformed or unrecognized envelopes as `unknown`, which blocks retirement until investigated. Store each output beside its backup metadata, under the backup system's normal access controls.

   Build one non-secret escrow inventory file from the authoritative secure key-escrow records:

   `{"keyIds":["credential-key-2026-01","credential-key-2026-04"],"legacyV1Available":true}`

   The inventory contains key IDs and a boolean only, never key material or the legacy secret. Keep it in a protected operator-controlled location; do not put secrets in the manifest or inventory file.

   Supply every not-yet-expired retained manifest to the retirement check (repeat `--manifest` for each file):

   `pnpm --filter @workspace/api-server run credentials:check-retirement -- --key-id credential-key-2026-01 --manifest /secure/backups/backup-2026-11-07.credentials.json --escrow-inventory /secure/escrow/customer-credential-inventory.json`

   A nonzero exit blocks retirement. The report identifies retained snapshots that still use the target key, any other required IDs missing from escrow, legacy-v1 dependencies without confirmed legacy-secret escrow, and unknown envelopes. A target key still required by any unexpired snapshot cannot be retired. Expired manifests also block by default because the check cannot verify that a backup was actually deleted or made non-restorable. After confirming that condition in the backup system, either omit that manifest from the check or pass `--confirm-expired-snapshots-deleted`. The command is read-only: it does not alter keys, secrets, backups, or the active keyring.

   This tooling does not connect to a cloud backup catalog or secret manager. Operators must enumerate all retained snapshots and build the escrow inventory from the deployment's authoritative systems; an omitted snapshot or inaccurate inventory cannot be detected by the command.

Rollback means restoring the previous active ID **while retaining all keys already used**. Do not deploy a v1-only binary after any v2 writes. Retain the new key even when rolling the active ID back; interrupted batches can contain both versions/IDs. If a required key has been lost permanently, only affected customers need to reconnect. Do not print envelopes or raw exceptions while investigating.
