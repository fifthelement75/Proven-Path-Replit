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

## Case-insensitive unique indexes break deploy if put in Drizzle schema

- Functional / expression unique indexes on `lower(<text col>)` (e.g. `employees_company_email_lower_unique` on `(company_id, lower(email))`, `companies_name_lower_unique`) must be created **manually via raw SQL** and kept OUT of the Drizzle schema files.
- **Why:** `drizzle-kit push` (which runs as the deploy-time DB migration) mis-generates the operator class for a text expression when it's mixed with an int column — it emits `lower(email) int4_ops`, and Postgres rejects it: `operator class "int4_ops" does not accept data type text`. This fails the deployment migration.
- **Symptom of regression:** deploy fails with `CREATE UNIQUE INDEX ... USING btree (company_id int4_ops, lower(email) int4_ops); operator class "int4_ops" does not accept data type text`. Fix = remove the `uniqueIndex(...).on(col, sql\`lower(...)\`)` from the Drizzle schema; the constraint stays enforced by the manual index + app-level `lower(email)` pre-checks.
