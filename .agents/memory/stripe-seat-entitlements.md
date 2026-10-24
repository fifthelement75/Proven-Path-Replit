---
name: Stripe seat entitlements
description: Paid access and employee limits must be derived from recognized Stripe products and subscription quantities.
---

Treat the recognized Stripe price/product pair and its subscription-item quantity as the authoritative paid entitlement. An active Stripe status by itself is not sufficient. Explicit company-wide complimentary grants are a separate entitlement, not a paid Stripe subscription.

**Why:** Unknown active products can otherwise unlock paid access, and Team subscriptions can exceed the seats actually purchased.

**How to apply:** On Stripe subscription or paid-invoice events, resolve the canonical plan from the exact active monthly USD price/product and persist its valid quantity. Gate access on both a recognized plan and active status, and serialize employee inserts against the persisted seat limit.

The user approved company-wide complimentary Team access to resolve the owner's admin lockout, while keeping the admin account separate from employee profiles.

**Why:** An admin role alone does not bypass subscription restrictions. The owner explicitly requested complimentary access rather than creating an employee record or buying a subscription.

**How to apply:** Preserve explicit complimentary grants across Stripe updates. They unlock the full company Team experience without fabricating a paid subscription or changing other companies' access. Do not create employee records solely to make a company admin's profile route work.