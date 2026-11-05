# Automatic HRIS and ATS sync

Automatic sync is opt-in per company connection. Meeting-note imports remain
manual and are not used by this worker. Connecting a provider does not enable a
schedule.

## Setup

1. Open Settings → Integrations → Configure sync.
2. Select a supported read operation. Supply its non-secret request properties.
   Some providers expose only individual-record reads; those can refresh the
   selected profile but cannot discover a whole directory.
3. Preview each field's provider path (`personal.name`, for example) or normalized
   value (`$name`). Assign ownership to the provider or Proven Path.
4. Configure the provider's documented pagination input, actual page size, and,
   for cursor APIs, the next-token response path. The worker will not guess API
   property names. A single-result read must not be used for a paginated
   directory. A response exceeding the approved page size is rejected.
5. Optionally map a provider update timestamp. The high-water timestamp advances
   only after a complete scan without record issues. An optional supported
   updated-since input receives it as ISO 8601; otherwise filtering occurs
   locally. Inclusive timestamp comparisons prevent losing equal-timestamp
   records.
6. Review the sample and approve it within 15 minutes. Editing a mapping or
   changing the authorized account requires a new preview and approval.

New employees require real name, email, job role, department, level and start
date, with provider ownership. New candidates require name and application role;
email is optional. No access roles, passwords, review scores, payroll fields or
deletions are synchronized. Existing identity links survive disconnect/reconnect.
Missing provider-owned mapped values are reported, never silently retained or
cleared. Remove an optional field mapping if the provider does not return it.

## Conflict handling

Provider ownership does not authorize silently discarding local edits. On the
first automatic pass an existing mismatched field needs a reviewed import. On
later passes local changes since the last applied snapshot are reported as
conflicts. Reconcile through Data exchange (or edit the local record to match
the approved provider value), then rerun. Email identity changes always require
manual reconciliation.

Successful records are committed even if another record fails. Each completed
page is checkpointed. Failed pages can safely be read again. The status view shows
the latest run's issues, while recent runs retain previous results.

## Outbound writes

Outbound configuration is optional and separately confirmed at approval. Only
locally owned fields and remote identity may feed an external action. Static
properties are not supported. Only the verified BambooHR employee update
(job title, department, work email and hire date) and Workday business-title
update are eligible, with employeeId/workerId mapped to the stable remoteId.
Create-candidate and append-note operations are never eligible for scheduling:
they remain in reviewed, manually confirmed Data exchange. This policy is
checked again for stored schedules, not just when a new mapping is previewed.

The outbound ledger is committed before dispatch. The same action/payload/remote
identity is never automatically sent twice, even after a process crash or a
disconnect. A timeout or failure blocks further writes to that remote record
until an admin checks the provider and reconciles the outcome. “Not applied”
does **not** automatically retry the same payload. Perform any intentional retry
as a separately confirmed manual exchange after checking the provider.

## Worker operation

The API process starts a worker every 30 seconds. No separate process or webhook
configuration is necessary. Each pass processes up to 20 due connections, at most
five read pages per connection, and at most 20 new external writes. Full pages
resume in one minute; completed scans follow the approved 15–1440-minute
interval. Safe reads retry at most twice with exponential backoff (60 seconds for
rate limits). Reads/pages and writes are paced at one per second. The provider may
impose lower limits; repeated failures are visible in Settings and defer the next
pass. External writes have no automatic retry.

PostgreSQL transaction advisory locks exclude overlapping workers across API
replicas. Short configuration row locks fence local changes and external
dispatch against disable/approval changes. Disable returns only after any
already-dispatched write finishes its local dispatch section; it cannot undo a
request already received by the provider. Safe reads in flight cannot apply
records after disabling. Disconnection stops the schedule before remote
revocation, even if revocation fails.

The worker verifies account ownership, environment, health and current Team
entitlement before every page. Revoked/replaced accounts or lost entitlement
disable the schedule. Status, disabling and reconciliation remain available to
admins after entitlement loss. Last/next status updates every 15 seconds in
Settings. Schedules resume on API startup; they do not execute while no API
process is running.

Schema creation is additive and runs during API startup before traffic is
accepted. No existing imported records are deleted.
