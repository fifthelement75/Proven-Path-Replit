---
name: Employee provisioning & login invites
description: How "Add employee" provisions login access on career-passport, and the activation flow.
---

# Add employee = create record + send login invite

On the /employees page there is a single "Add employee" action (the standalone
"Invite user" button was merged away). Adding an employee creates the employee row
AND a pending invitation, then emails a login link. The invitee sets a password via
the accept page and can then log in.

**Why:** plain "Add employee" used to create a passwordless record that could never
log in; the only login path was the separate invite. The user explicitly chose to
merge the two so one action both records the person and grants login.

**How to apply (key invariants):**
- `POST /employees` and `POST /invitations/accept/:token` must stay consistent:
  Add creates a passwordless employee + pending invite; accept ACTIVATES that
  existing row (sets passwordHash/name/userRole) rather than inserting a duplicate.
  Accept still 409s if the employee already has a passwordHash.
- Email uniqueness per company is enforced by the unique index
  `employees_company_email_lower_unique` on `(company_id, lower(email))`. Login
  looks up by email and takes the first match, so duplicates would break login —
  never drop this index.
- Invitation emails are sent AFTER the DB transaction commits
  (createInvitationRecord = tx-aware DB write; deliverInvitationEmail = post-commit
  send, never throws), so a rolled-back insert never produces a stray invite email.
