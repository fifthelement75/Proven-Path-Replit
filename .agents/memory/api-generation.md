---
name: API generation compatibility
description: Non-obvious constraints when regenerating API clients and runtime validators.
---

Treat the OpenAPI spec as the source of runtime validation behavior, not only client types. Regeneration can remove manual validator repairs if the spec is missing them.

**Why:** Regenerating for integrations removed employee creation role validation because that enum existed in generated code but not in the source spec. Compatibility tests caught the regression.

**How to apply:** Keep optional employee access roles constrained to the supported role enum in the spec. Run schema compatibility tests after generation. Orval must target React Query v5 here, and generated Header iteration requires DOM.Iterable in the client library's TypeScript configuration.

Explicitly prefer runtime validator exports where legacy request interface names collide with operation validator names.

**Why:** Ambiguous wildcard exports prevented the validator library from emitting new declarations, making new endpoints appear missing to API typechecking despite successful runtime builds.

**How to apply:** Do not introduce new operation-shaped body component names. Preserve the legacy explicit export resolution until those old body names can be migrated deliberately.
