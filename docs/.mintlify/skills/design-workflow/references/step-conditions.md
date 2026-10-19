# Step Conditions

A step condition decides whether a step **runs** or is **skipped**. Same semantics on both authoring surfaces; different syntax.

| Surface              | Syntax                                            |
| -------------------- | ------------------------------------------------- |
| Dashboard (no-code)  | [JSON-Logic](https://jsonlogic.com) on `step.condition` — `{ "==": [...] }` |
| Framework (`@novu/framework`) | `skip: () => boolean \| Promise<boolean>` callback    |

> Dashboard semantics: condition evaluates to `true` ⇒ step **runs**.
> Framework semantics: `skip` returns `true` ⇒ step **is skipped**.
> They're mirror images — invert the boolean when porting between surfaces.

## Available Variables

Use **only** variables that are in scope for the workflow run.

> **Prefer reusing existing variables for consistency.** Only introduce new `payload.*` variables when truly needed — duplication makes templates and conditions harder to maintain.

### Variable Namespaces

| Namespace      | Source       | Contents                                                                                                                                                                         |
| -------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workflow.*`   | system       | Workflow metadata: `workflowId`, `name`, `description`, `tags`, `severity`                                                                                                       |
| `subscriber.*` | system       | Recipient info: `firstName`, `lastName`, `email`, `phone`, `avatar`, `locale`, `timezone`, `subscriberId`, `isOnline`, `lastOnlineAt`, `data`                                    |
| `payload.*`    | user-defined | Event data passed at trigger time (e.g. `actionUrl`, `productName`, `orderNumber`). Validated against `payloadSchema` when defined.                                              |
| `steps.*`      | system       | Step results: In-App `seen` / `read`, digest `events` / `eventCount`, HTTP response properties (only those declared in `responseBodySchema`)                                     |
| `context.*`    | user-defined | Multi-tenant metadata passed at trigger time (e.g. `tenant`, `region`, `app`). See [`inbox-integration/SKILL.md`](../../inbox-integration/SKILL.md) for context-based isolation. |

### Subscriber Properties

Available `subscriber.*` properties:

- `subscriber.firstName`
- `subscriber.lastName`
- `subscriber.email`
- `subscriber.phone`
- `subscriber.avatar`
- `subscriber.locale`
- `subscriber.timezone`
- `subscriber.subscriberId`
- `subscriber.isOnline`
- `subscriber.lastOnlineAt`
- `subscriber.data` (custom subscriber data; deeply addressable as `subscriber.data.<key>`)

### Step Outputs

| Path                        | When available       | Notes                                                            |
| --------------------------- | -------------------- | ---------------------------------------------------------------- |
| `steps.<stepId>.seen`       | After an In-App step | Boolean — `true` once the user has seen the notification         |
| `steps.<stepId>.read`       | After an In-App step | Boolean — `true` once the user has marked it read                |
| `steps.<stepId>.events`     | After a digest step  | Array of digested trigger events                                 |
| `steps.<stepId>.eventCount` | After a digest step  | Length of `events` (convenience for templates)                   |
| `steps.<stepId>.<prop>`     | After an HTTP step   | Only properties declared in `responseBodySchema` are addressable |

## Canonical Conditions (Dashboard JSON-Logic)

### Subscriber is offline

```json
{ "==": [{ "var": "subscriber.isOnline" }, "false"] }
```

### In-App was not read

```json
{ "==": [{ "var": "steps.<stepId>.read" }, "false"] }
```

### In-App was not seen

```json
{ "==": [{ "var": "steps.<stepId>.seen" }, "false"] }
```

### Workflow tags include any of

```json
{ "in": ["tag1,tag2", { "var": "workflow.tags" }] }
```

### HTTP response property equals a value

```json
{ "==": [{ "var": "steps.<http-step-id>.status" }, "active"] }
```

> The property must be declared in the HTTP step's `responseBodySchema`. Undeclared properties are not addressable.

## Framework Equivalents

The same conditions in `@novu/framework`. Note that `skip` is the inverse of "run if true" — you return `true` to **skip**.

### Subscriber is offline (run only if offline)

```typescript
const inApp = await step.inApp("inbox", async () => ({ /* ... */ }));

await step.push("offline-push", async () => ({ title: "...", body: "..." }), {
  skip: ({ subscriber }) => subscriber.isOnline === true,
});
```

### In-App was not read (send email fallback)

```typescript
const inApp = await step.inApp("inbox", async () => ({ /* ... */ }));

await step.delay("wait", async () => ({ unit: "hours", amount: 4 }));

await step.email("fallback", async () => ({ subject: "...", body: "..." }), {
  skip: () => inApp.read === true,
});
```

### Branch on HTTP response

```typescript
const plan = await step.http("fetch-plan", async () => ({
  method: "GET",
  url: `https://api.example.com/users/${payload.userId}/plan`,
  responseBodySchema: {
    type: "object",
    properties: { status: { type: "string" } },
    required: ["status"],
  } as const,
}));

await step.email("notify", async () => ({ /* ... */ }), {
  skip: () => plan.status !== "active",
});
```

## Quick Reference

| Intent                                       | Dashboard (JSON-Logic)                                                          | Framework (`skip`)                              |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| Run only when subscriber is offline          | `{ "==": [{ "var": "subscriber.isOnline" }, "false"] }`                         | `skip: () => subscriber.isOnline === true`      |
| Run only when In-App not read                | `{ "==": [{ "var": "steps.inbox.read" }, "false"] }`                            | `skip: () => inAppResult.read === true`         |
| Run only when In-App not seen                | `{ "==": [{ "var": "steps.inbox.seen" }, "false"] }`                            | `skip: () => inAppResult.seen === true`         |
| Run only for workflows tagged "billing"      | `{ "in": ["billing", { "var": "workflow.tags" }] }`                             | `skip: () => !tags.includes("billing")`         |
| Run only when HTTP `status == "active"`      | `{ "==": [{ "var": "steps.fetch.status" }, "active"] }`                         | `skip: () => fetchResult.status !== "active"`   |

## Common Pitfalls

1. **Inverting the boolean wrong** — Dashboard runs when condition is `true`; Framework `skip` skips when `true`. They're opposites.
2. **Referencing undeclared HTTP properties** — only properties in `responseBodySchema` are addressable in `steps.<http>.<prop>`.
3. **Using `subscriber.isOnline == true` as a string** — `isOnline` is a boolean. Use `"false"` (string) only in JSON-Logic; in Framework use the JS boolean `false`.
4. **Conditions on a delay step** — delays support skip too, but if a delay is skipped the workflow proceeds immediately. Don't treat skip as "shorten".

## See Also

- [`channel-selection.md`](./channel-selection.md) — uses these conditions for offline gating
- [`workflow-templates.md`](./workflow-templates.md) — every template's `Step condition` lines map to these snippets
- [`framework-integration/references/workflow-and-steps.md`](../../framework-integration/references/workflow-and-steps.md) — full Framework `skip` reference
- [`dashboard-workflows/references/step-conditions.md`](../../dashboard-workflows/references/step-conditions.md) — Dashboard / Novu MCP authoring flow, including the merge / replace / remove intent rules
