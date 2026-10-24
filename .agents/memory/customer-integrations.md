---
name: Customer self-service integrations
description: Integrations are a multi-tenant product feature, not the owner's personal tool connections.
---

Every company admin should be able to authorize whichever HRIS, ATS, and Meeting Intelligence tools are listed in Proven Path. Do not scope implementation to the workspace owner's preferred tools or treat one developer-connected account as all customers' connection.

**Why:** The user explicitly clarified that provider choice depends on each customer company, after being asked which tools to implement first.

**How to apply:** Design customer-specific authorization, company-isolated credentials and data, and provider-specific sync capabilities. Distinguish platform infrastructure setup from customers connecting their tools. Display provider access requirements and unsupported write operations honestly.

## Pipedream infrastructure authorization

The Replit Pipedream catalog connector's standard REST API key does not authorize Pipedream Connect. Embedded customer authorization needs a Connect project and its own OAuth client credentials.

**Why:** These are separate Pipedream API surfaces; connecting the catalog integration alone cannot enable customer account linking.

**How to apply:** Check Connect configuration separately. Do not repeatedly propose the standard Pipedream integration to resolve missing Connect credentials; request required credentials through the secure secrets flow.

## Direct customer API credentials

When a provider is absent from the broker catalog, customer-provisioned credentials may be stored encrypted with company/provider/environment/connection binding. Do not fall back to the workspace owner's credentials.

**Why:** Otter Enterprise and provisioned iCIMS integration accounts can support customer-specific direct API access even without a Pipedream catalog listing.

**How to apply:** Require a real read-only health check and explain account prerequisites. Do not imply that local disconnect globally revokes a vendor API key, or that a working customer-specific adapter has vendor Marketplace certification.
