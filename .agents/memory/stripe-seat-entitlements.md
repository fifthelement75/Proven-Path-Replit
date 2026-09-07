---
name: Stripe seat entitlements
description: Paid access and employee limits must be derived from recognized Stripe products and subscription quantities.
---

Treat the recognized Stripe price/product pair and its subscription-item quantity as the authoritative paid entitlement. An active Stripe status by itself is not sufficient.

**Why:** Unknown active products can otherwise unlock paid access, and Team subscriptions can exceed the seats actually purchased.

**How to apply:** On Stripe subscription or paid-invoice events, resolve the canonical plan from the exact active monthly USD price/product and persist its valid quantity. Gate access on both a recognized plan and active status, and serialize employee inserts against the persisted seat limit.