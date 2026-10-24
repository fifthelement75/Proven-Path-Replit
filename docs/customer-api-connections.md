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
- Encryption uses a domain-separated key derived from the existing server session secret, with independently generated nonces. The session secret must contain at least 32 characters; otherwise credential authorization is disabled.
- **Changing the session secret makes existing stored customer credentials unreadable.** Customers must reconnect after rotation. Keep the secret stable until a multi-key rotation mechanism is implemented; do not silently replace it.
- Development and production credentials are separate. Authorizing an account in development does not authorize production.
- Requests use fixed HTTPS vendor hosts, do not follow redirects, have timeouts and bounded responses, and never expose upstream error bodies.
- Connection health is checked when loading status and before exchange. Revoked credentials require reauthorization.
- Disconnect deletes the connection and encrypted credential, including already-revoked credentials. Imported local records remain.
- Neither adapter has a documented endpoint to revoke its API credential globally. **Revoke or rotate it in the provider's own administration UI** to invalidate it everywhere. Local disconnect must not be described as global vendor revocation.

Real customer-account access still depends on the customer supplying provisioned credentials. Automated tests simulate the documented API responses; no live customer credentials were used for implementation verification.
