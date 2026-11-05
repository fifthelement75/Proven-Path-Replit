---
name: Integration data safety
description: Decisions for customer authorization, reviewed exchange, and safe retries.
---

Provider authorization is not proof that data synchronization is configured. Never label a metadata-only selection as connected. Check the company identity, provider, environment and remote account health before exchange.

**Why:** The original integration menu saved provider names without any actual authorization. The user expects functional, company-specific integrations, not saved selections.

**How to apply:** Keep customer linking tokens restricted to account management; perform approved data operations on the server. Do not expose broad action execution through browser tokens.

Use reviewed imports and explicitly confirmed write-backs unless an admin has previewed and approved per-field ownership for automatic synchronization. Never invent employee fields or meeting dates to make imports succeed.

**Why:** HRIS/ATS records affect employee identity and employment information, and meeting notes can be sensitive. A generic two-way overwrite is unsafe without per-field ownership.

**How to apply:** Preserve remote-to-local identity mappings across disconnect/reconnect. Update an existing imported record after reviewed source changes instead of duplicating it. Persist uncertain write outcomes and require reconciliation rather than automatically retrying potentially completed writes.

Reconciliation is not retry authorization. Marking an uncertain outbound write “not applied” must not automatically resend that same payload; an intentional retry needs a separate, explicitly confirmed manual exchange.

**Why:** Checking a provider's state and authorizing another mutation are distinct admin decisions. Combining them can duplicate an external mutation when the provider's readback is delayed.

**How to apply:** Preserve this distinction when adding retry controls, provider adapters or recovery jobs. HRIS/ATS automation must not implicitly expand to meeting-note ingestion.

Scheduled outbound synchronization is for verified updates targeting a stable remote record, never create/append operations.

**Why:** A payload ledger prevents retrying one payload, but a later local edit creates a different payload. Automatically dispatching a create/append action again would duplicate candidates or notes even after a fully successful prior write.

**How to apply:** Keep create/append actions in separately confirmed manual Data exchange. Verify update semantics and the remote-ID targeting property before expanding automatic provider write support.

Do not automatically distribute imported meeting notes to everyone named in a transcript; require an admin to select the employee receiving the note.

**Why:** Shared meetings can contain sensitive coaching content. Attendance alone is not consent to attach the entire summary to each employee's feedback history.

**How to apply:** Keep employee assignment explicit and company-scoped. Expanding to multiple employees needs a deliberate per-recipient review flow rather than automatic attendee matching.
