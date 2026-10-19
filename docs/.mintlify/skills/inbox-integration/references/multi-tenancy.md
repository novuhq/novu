# Multi-Tenancy with Contexts

Use **Contexts** to scope notifications by tenant, workspace, organization, environment, or feature area — without duplicating workflows or subscribers. The Inbox displays only notifications whose trigger context exactly matches the Inbox context.

> Contexts are a Novu primitive. If you're new to them, start with the [Contexts overview](https://docs.novu.co/platform/workflow/advanced-features/contexts).

## How context filtering works

The Inbox uses **exact-match** filtering. The full context object passed to the `<Inbox>` must equal (key for key, value for value) the context used at trigger time:

| Workflow Context | Inbox Context | Displayed? |
| --- | --- | --- |
| `{ tenant: "acme" }` | `{ tenant: "acme" }` | ✅ |
| `{}` | `{}` | ✅ |
| `{}` | `{ tenant: "acme" }` | ❌ |
| `{ tenant: "acme" }` | `{ tenant: "globex" }` | ❌ |
| `{ tenant: "acme" }` | `{}` | ❌ |
| `{ tenant: "acme", app: "first" }` | `{ tenant: "acme" }` | ❌ |

This isolation makes context predictable and tamper-resistant (when combined with `contextHash`).

## End-to-end setup

### 1. Define the tenant context

A tenant context is a JSON object that identifies a tenant. The `id` is the only required field; `data` is optional metadata.

```ts
const acmeContext = {
  tenant: {
    id: "acme-corp",
    data: {
      name: "Acme Corporation",
      plan: "enterprise",
      logo: "https://cdn.acme.com/logo.png",
    },
  },
};
```

You can also pass a bare string for simple cases:

```ts
const acmeContext = { tenant: "acme-corp" };
```

Contexts are **auto-created** when first seen by Novu (via trigger or Inbox). Existing contexts are **not** auto-updated to prevent overwriting tenant data.

To manage contexts manually, use the dashboard's **Contexts** section, the API, or `@novu/api`.

### 2. Trigger workflows with context

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({ secretKey: process.env.NOVU_SECRET_KEY! });

await novu.trigger({
  workflowId: "invoice-paid",
  to: { subscriberId: "user-123" },
  payload: { amount: "$250" },
  context: {
    tenant: {
      id: "acme-corp",
      data: { name: "Acme Corporation", plan: "enterprise" },
    },
  },
});
```

All notifications emitted by this trigger are isolated to the `acme-corp` tenant. They will only surface in an Inbox initialized with the same tenant context.

### 3. Filter the Inbox by tenant

```tsx
import { Inbox } from "@novu/react";

<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="user-123"
  subscriberHash={subscriberHash}
  context={{
    tenant: {
      id: "acme-corp",
      data: { name: "Acme Corporation", plan: "enterprise" },
    },
  }}
/>;
```

If a subscriber switches tenants in your app, re-render the Inbox with the new context. The Inbox automatically refetches notifications and reconnects the WebSocket scope.

### 4. Secure the context with `contextHash`

Because `context` is set on the client, a hostile user could swap the tenant ID to peek at another tenant's notifications. To prevent that, generate an HMAC hash of a **canonicalized** context server-side.

Canonicalization is required because JSON objects with the same data but different key order would otherwise produce different hashes. Use a library that implements [RFC-8259](https://datatracker.ietf.org/doc/html/rfc8259) canonicalization.

```typescript
import { createHmac } from "crypto";
import { canonicalize } from "@tufjs/canonical-json";

const context = {
  tenant: {
    id: "acme-corp",
    data: { name: "Acme Corporation", plan: "enterprise" },
  },
};

export function getContextHash(context: object): string {
  return createHmac("sha256", process.env.NOVU_SECRET_KEY!)
    .update(canonicalize(context))
    .digest("hex");
}

const contextHash = getContextHash(context);
```

Pass both `context` and `contextHash` to the Inbox:

```tsx
<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="user-123"
  subscriberHash={subscriberHash}
  context={context}
  contextHash={contextHash}
/>
```

> If you change the `context` you must regenerate the `contextHash`. The hash is bound to the exact, canonicalized JSON.

## Patterns

### Switching tenants client-side

```tsx
"use client";

import { useState } from "react";
import { Inbox } from "@novu/react";

export function MultiTenantInbox({ user, tenants }) {
  const [activeTenant, setActiveTenant] = useState(tenants[0]);

  return (
    <>
      <select
        value={activeTenant.id}
        onChange={(e) => setActiveTenant(tenants.find((t) => t.id === e.target.value))}
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>{t.data.name}</option>
        ))}
      </select>

      <Inbox
        applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID!}
        subscriberId={user.id}
        subscriberHash={user.subscriberHash}
        context={{ tenant: activeTenant }}
        contextHash={user.contextHashByTenant[activeTenant.id]}
      />
    </>
  );
}
```

Pre-compute one `contextHash` per tenant on the server:

```ts
const contextHashByTenant = Object.fromEntries(
  user.tenants.map((t) => [t.id, getContextHash({ tenant: t })]),
);
```

### Per-feature scoping

Contexts aren't limited to tenants — use them to scope by feature area, environment, or anything else:

```ts
context: {
  app: "billing",
  workspace: "production",
}
```

The Inbox in your billing dashboard sees only billing notifications; the inbox in your monitoring dashboard sees only monitoring notifications.

### Combining tenant + app

```ts
context: {
  tenant: { id: "acme-corp", data: { name: "Acme" } },
  app: "billing",
}
```

The Inbox must declare the same combined context to see these notifications.

## Using context data in templates

Once a context is created, its `data` is exposed in every template editor (email, in-app, SMS, push) via the `{{context}}` helper. This lets you personalize content per tenant from a single workflow definition.

Example In-App body:

```liquid
Hello {{subscriber.firstName}}, your {{context.tenant.data.plan}} plan
on {{context.tenant.data.name}} just renewed.
```

You can also branch workflow logic on context. See [Contexts in Workflows](https://docs.novu.co/platform/workflow/advanced-features/contexts/contexts-in-workflows).

## Operational notes

- **Auto-create**: contexts referenced for the first time are automatically created in Novu. Visible in the dashboard under **Contexts**.
- **No auto-update**: existing context data is never overwritten by a new trigger or Inbox initialization. To update tenant data, use the API.
- **Context + HMAC**: when HMAC is enforced for the project, you must also pass `contextHash` if `context` is set. Subscribers will see no notifications otherwise.
- **Order-independent hashing**: always canonicalize the JSON before hashing so `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` produce the same hash.
- **Tenant switch ⇒ re-render**: changing `context` triggers a re-fetch and a new WebSocket subscription scope.

## Common pitfalls

1. **Empty context vs no context** — `context={{}}` is treated as "no context". Notifications triggered with a non-empty context will not appear, and vice versa.
2. **Mismatched object shape** — `{ tenant: "acme" }` is not equal to `{ tenant: { id: "acme" } }`. Pick one shape and use it consistently in both trigger and Inbox.
3. **Forgetting to regenerate the hash** — any change to the context object requires a new `contextHash`. A stale hash silently drops notifications.
4. **Canonicalization mismatch** — if your server canonicalizes but your test fixture doesn't (or vice versa), hashes diverge. Always go through the same `canonicalize` step.
5. **Storing secrets in `data`** — context data is read from the client. Don't include API keys, tokens, or PII you wouldn't otherwise expose.
