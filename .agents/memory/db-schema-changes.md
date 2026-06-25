---
name: db schema changes (drizzle-kit push blocked)
description: How to apply Drizzle schema/table changes in this repo without the interactive push prompt
---

# Applying DB schema changes

- `drizzle-kit push` is effectively unusable here: it hangs on an interactive prompt because of pre-existing drift on the `promo_codes` table. Do NOT rely on it in automated flows.
- To create/alter tables, run DDL directly via `psql "$DATABASE_URL"` or execute it through the `@workspace/db` package in the code-execution sandbox.
- New tables still need a Drizzle schema file under `lib/db/src/schema/` and an export from that dir's `index.ts` barrel so app code can query them — the DDL and the schema file must be kept in sync by hand.

**Why:** push's drift prompt blocks non-interactively, so a normal `push` silently stalls instead of applying changes.

**How to apply:** When adding a table/column, (1) write the Drizzle schema + barrel export, (2) apply the matching DDL via psql or the db sandbox — never via `drizzle-kit push`.

**Recurring gap to check:** Any table added by a task agent (e.g. `invitations`) may NOT be in the live DB if that agent relied on `drizzle-kit push` — it will have silently stalled. After every merge that adds a new table, verify with `psql "$DATABASE_URL" -c "\dt <table_name>"` and apply DDL manually if missing.
