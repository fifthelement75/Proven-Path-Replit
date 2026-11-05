# Threat Model

## Project Overview

Career Passport / "Proven Path" — a multi-tenant SaaS performance-management platform. Companies register, manage employees, run performance/peer/self reviews, log 1:1 feedback, generate AI development plans, share read-only profile links, and connect HRIS/ATS/meeting tools. pnpm monorepo: Express 5 API (`artifacts/api-server`, all routes under `/api`), React+Vite frontend (`artifacts/career-passport`), marketing site, PostgreSQL + Drizzle (`@workspace/db`). Deployed publicly as an autoscale deployment at https://provenpath.app.

## Assets

- **Company/employee accounts & credentials** — bcrypt password hashes on `companies` and `employees`, JWTs (HS256, `JWT_SECRET`) stored in browser localStorage (`career_passport_token`).
- **Performance data (PII)** — reviews, peer reviews, feedback, development plans, scores, candidate profiles. Sensitive per-employee data.
- **Billing state** — Stripe customer/subscription IDs, plan, seat quantity, complimentary-access flags on `companies`.
- **Integration credentials** — customer-supplied provider API credentials (AES-GCM encrypted) and Pipedream broker account references.
- **Application secrets** — `JWT_SECRET`, DB connection string, Resend key, Stripe keys (via Replit connector), credential-encryption key.

## Trust Boundaries

- **Browser → API** — all client requests; client is untrusted. Auth via `Authorization: Bearer <JWT>`.
- **Public → Authenticated** — public: `/api/auth/*`, `/api/contact`, `/api/share/:token`, panel-invite assessment, `/api/stripe/webhook`, `/api/stripe/config`. Everything else requires `requireAuth`.
- **Tenant boundary (companyId)** — the primary isolation boundary. Every query must be scoped by `companyId`.
- **Role boundary (within tenant)** — admin (company owner with `employeeId=null`, or employee with `userRole=admin`), manager (own team), employee (own profile). Roles re-resolved from DB on each request in `middlewares/auth.ts`.
- **API → Stripe / Pipedream / OpenAI / Resend** — outbound third-party calls with server-held secrets.

## Scan Anchors

- Auth/authz core: `artifacts/api-server/src/middlewares/auth.ts` (requireAuth/requireAdmin/requireManagerOrAdmin), `src/lib/access.ts` (canAccessEmployee/managerCanAccessEmployee), `src/middlewares/requireActivePlan.ts`.
- Highest-risk route files: `routes/employees.ts`, `reviews.ts`, `feedback.ts`, `devplan.ts`, `companies.ts`, `peerReviews.ts`, `selfReflection.ts`, `candidates.ts`, `share.ts`, `invitations.ts`, `panelInvites.ts`, `integrations.ts`, `integrationExchange.ts`, `stripe.ts`, `promo.ts`.
- Billing sync: `lib/stripeWebhook.ts` + external `stripe-replit-sync` (NOTE: `processWebhook` returns void — app's custom handlers are dead code; see billing-integrity finding).
- Secrets/encryption: `lib/customerCredentials.ts` (AES-GCM, tenant/provider/env/connection-bound key derivation), `lib/stripeClient.ts` (Replit connector).
- Public surfaces to watch: `routes/contact.ts` (unauthenticated, no rate limit), `routes/share.ts` (`/share/:token`, 32-byte random token), panel-invite public assessment.
- Dev-only (ignore unless proven reachable): `artifacts/mockup-sandbox` (preview-only), client `import.meta.env.DEV`-guarded code.

## Threat Categories

### Elevation of Privilege / Broken Access Control (primary risk)

Most endpoints correctly scope by `companyId` and (for cross-user data) call `canAccessEmployee`. However several endpoints enforce only `requireAuth` + `companyId` and omit the per-user/per-role check, letting any authenticated employee read or mutate coworkers' private data or view org-wide data:
- `routes/feedback.ts` — all feedback read/create/respond endpoints.
- `routes/devplan.ts` — dev-plan read / generate (overwrite) / skill-complete.
- `routes/companies.ts` — `/companies/me/health`, `/activity`, `/employee-summaries` (company-wide performance data to any employee; export is correctly admin-only).
- `routes/integrations.ts` — `GET /integrations` metadata to any employee (admin-only elsewhere).

Guarantee: every endpoint exposing or mutating another employee's review/feedback/dev-plan/profile data MUST enforce role + ownership (`canAccessEmployee` / `requireManagerOrAdmin` / `requireAdmin`) in addition to the tenant check. Integration configuration MUST be admin-only.

### Spoofing / Authentication

JWTs are HS256-signed with `JWT_SECRET`; role is re-resolved from DB each request (good). Stripe webhook signature is verified against the raw body before `express.json()` (good). Share and panel-invite tokens are 32-byte CSPRNG with expiry (good). Guarantee: `JWT_SECRET` must remain secret and tokens must stay server-verified.

### Tampering / Business Logic

Checkout plan/seat selection and subscription plan are validated server-side against Stripe's actual price/product (`stripeHelpers.getTrustedSubscriptionSelection`). Mass-assignment on employee update strips privileged fields for non-admins. Risk: billing entitlement state never syncs from Stripe because webhook handlers are unreachable (see billing-integrity finding) — cancellations/payment failures do not revoke access.

### Information Disclosure

Public `/share/:token` intentionally exposes a read-only employee profile bound to an unguessable token. Integration errors are sanitized and avoid logging credentials/PII. Customer credentials are AES-GCM encrypted at rest. Main gap is the within-tenant access-control disclosures above.

### Denial of Service

`/api/contact` is unauthenticated with no rate limiting and sends outbound email per request (bounded to a fixed inbox / email quota). Request bodies capped at 5mb. Guarantee: unauthenticated side-effecting endpoints should be rate-limited.

### SSRF

Integration outbound calls use fixed/validated provider URLs via Pipedream and the customer-credential layer; no user-controlled fetch target was found. DevPlan AI prompt embeds employee data but calls a fixed OpenAI endpoint (no SSRF). Prompt-injection into AI output is low-impact (stored dev-plan text, rendered as text, not executed).
