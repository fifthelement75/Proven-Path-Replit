---
name: career-passport auth & session expiry
description: How auth gating and 401/session-expiry are handled in the career-passport web app
---

# career-passport auth gating

- Route guards use `isAuthenticated = !!token` (token *presence* only, not validity). An expired JWT still renders admin pages because the user object is cached in localStorage; every API call then 401s.
- JWT expires after 7d (`signToken` in api-server middlewares/auth.ts). Admins are rows in the `companies` table, not employees.
- Canonical client request path: `apiFetch` in `lib/api.ts` attaches the auth header and, on any 401, clears the token and redirects to `<BASE_URL>/login`, throwing `UnauthorizedError` so callers short-circuit.

**Why:** "Connect doesn't work" on /settings was misdiagnosed as a backend bug; the real cause was a silently-expired session surfacing as a generic toast.

**How to apply:** When adding authenticated frontend calls, use `apiFetch` (not raw `fetch(getApiUrl(...))`) so session expiry redirects to login instead of failing silently. Many older pages still use raw fetch and have NOT been migrated.
