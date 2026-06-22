---
name: api-server build vs typecheck
description: Why tsc "no exported member" errors on @workspace/db barrel exports are false positives in api-server.
---

api-server is bundled with esbuild (build.mjs) which resolves `@workspace/db` from its
**source**, not its compiled dist. So `tsc` / IDE errors like "Module '@workspace/db' has
no exported member 'invitationsTable'" after adding a new schema + barrel export are usually
**stale-dist artifacts** — the runtime build and the running server work fine.

**Why:** the db package's published `dist` lags behind source until rebuilt; esbuild ignores
dist and reads source directly.

**How to apply:** after adding a db schema/barrel export, verify at runtime (restart the
server, curl the endpoint) rather than trusting tsc. Don't chase those specific tsc errors
unless the runtime endpoint actually fails. Rebuild the db package if you want tsc clean.
