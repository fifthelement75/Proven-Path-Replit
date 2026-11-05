---
name: Integration data safety
description: Decisions for customer authorization, reviewed exchange, and safe retries.
---

Provider authorization is not proof that data synchronization is configured. Never label a metadata-only selection as connected. Check the company identity, provider, environment and remote account health before exchange.

**Why:** The original integration menu saved provider names without any actual authorization. The user expects functional, company-specific integrations, not saved selections.

**How to apply:** Keep customer linking tokens restricted to account management; perform approved data operations on the server. Do not expose broad action execution through browser tokens.

Use reviewed imports and explicitly confirmed write-backs until source-of-truth mappings and automatic synchronization are defined. Never invent employee fields or meeting dates to make imports succeed.

**Why:** HRIS/ATS records affect employee identity and employment information, and meeting notes can be sensitive. A generic two-way overwrite is unsafe without per-field ownership.

**How to apply:** Preserve remote-to-local identity mappings across disconnect/reconnect. Update an existing imported record after reviewed source changes instead of duplicating it. Persist uncertain write outcomes and require reconciliation rather than automatically retrying potentially completed writes.

Do not automatically distribute imported meeting notes to everyone named in a transcript; require an admin to select the employee receiving the note.

**Why:** Shared meetings can contain sensitive coaching content. Attendance alone is not consent to attach the entire summary to each employee's feedback history.

**How to apply:** Keep employee assignment explicit and company-scoped. Expanding to multiple employees needs a deliberate per-recipient review flow rather than automatic attendee matching.
