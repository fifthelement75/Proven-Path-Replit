---
name: Dependency remediation constraints
description: Keep security overrides compatible with consumer APIs and review them against current advisories.
---

Use bounded, compatible release lines for security overrides rather than open-ended minimum versions.

**Why:** Open-ended minimum overrides in this project resolved to new major versions of Babel and js-yaml; old exact security pins subsequently became vulnerable themselves. An override is not permanently safe merely because it was originally introduced for security.

**How to apply:** Re-audit both direct dependencies and workspace overrides during remediation. Prefer patched releases on the consumer's supported major, preserve separate pre-1.0 dependency lines when patched releases exist, and verify code generation plus every affected artifact build. Treat a Zod 3-to-4 migration as a separate compatibility-sensitive change, not a blind transitive override.
