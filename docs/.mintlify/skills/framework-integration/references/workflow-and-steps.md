# Workflow & Step API Reference

Full reference for the `workflow()` and `step.*` APIs in `@novu/framework`.

## `workflow(id, handler, options?)`

```typescript
import { workflow } from "@novu/framework";

workflow(workflowId, handler, options);
```

### `workflowId: string`

Unique identifier within your environment. Used as the trigger key in `novu.trigger({ workflowId })`. Convention: kebab-case (`weekly-digest`, `password-reset`).

### `handler: ({ step, payload, subscriber }) => Promise<void>`

The body of the workflow. Receives:

| Field | Type | Description |
| --- | --- | --- |
| `step` | `StepBuilder` | All step methods (`step.email`, `step.delay`, etc.) |
| `payload` | `InferredFromSchema` | Validated trigger payload |
| `subscriber` | `Subscriber` | Recipient — `{ subscriberId, firstName?, lastName?, email?, phone?, locale?, timezone?, data?, ... }` |

### `options: WorkflowOptions`

| Option | Type | Description |
| --- | --- | --- |
| `payloadSchema` | `ZodSchema \| JsonSchema \| ClassValidatorClass` | Validates trigger payload, infers `payload` type |
| `name` | `string` | Display name in Dashboard / Inbox (defaults to `workflowId`) |
| `description` | `string` | Description shown in Dashboard |
| `tags` | `string[]` | Filter / Inbox tab grouping |
| `severity` | `'low' \| 'medium' \| 'high'` | Visual prioritization in the Inbox. Default unset. See [`inbox-integration/SKILL.md`](../../inbox-integration/SKILL.md#severity-styling). |
| `critical` | `boolean` | If `true`, the workflow **bypasses subscriber preferences**, **skips digest**, and runs **without delays**. Reserve for must-deliver events (account suspended, security alert, password reset). |
| `preferences` | `WorkflowPreferences` | Default channel preferences and `readOnly` flag |

### `severity` vs `critical` vs `readOnly`

Three distinct dials — pick deliberately. See [`design-workflow/references/severity-and-critical.md`](../../design-workflow/references/severity-and-critical.md) for the full matrix.

| Dial                                 | What it does                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `severity`                           | Pure visual prioritization in the Inbox. Does NOT change preferences, digest, or delivery.  |
| `critical: true`                     | Runtime override: bypasses preferences, skips digest, no delays. Forces delivery.           |
| `preferences.all.readOnly: true`     | Hides the workflow from the **Preferences UI**. Subscribers can't toggle channels for it.   |

`critical: true` is a stronger guarantee than `readOnly: true`. Use `critical` when you need to **force delivery**; use `readOnly` only when you want to **hide the toggle**.

### Workflow Preferences

```typescript
preferences: {
  all: { enabled: true, readOnly: false },
  channels: {
    email: { enabled: true },
    sms: { enabled: false },
    push: { enabled: true },
    chat: { enabled: false },
    inApp: { enabled: true },
  },
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `all.enabled` | `true` | Fallback for any channel not specified in `channels` |
| `all.readOnly` | `false` | If `true`, subscribers cannot disable channels in Preferences UI; this does **not** make the workflow critical |
| `channels.<channel>.enabled` | `true` | Per-channel default |

## Channel Steps

All channel steps share the same shape:

```typescript
await step.<channel>(stepId, resolver, options?);
```

### `step.email`

```typescript
await step.email("welcome", async (controls) => ({
  subject: "Welcome to Acme",
  body: "<p>Hello!</p>",
  attachments: [{ filename: "guide.pdf", content: pdfBuffer }],
  from: "hello@acme.com",
  replyTo: "support@acme.com",
}));
```

Returns: `void`.

| Output | Type | Required |
| --- | --- | --- |
| `subject` | `string` | Yes |
| `body` | `string` | Yes |
| `attachments` | `Attachment[]` | No |
| `from` | `string` | No |
| `replyTo` | `string` | No |

### `step.sms`

```typescript
await step.sms("verification", async () => ({
  body: `Your code is ${payload.code}`,
}));
```

| Output | Type | Required |
| --- | --- | --- |
| `body` | `string` | Yes |

### `step.push`

```typescript
await step.push("new-message", async () => ({
  title: "New Message",
  body: "You received a new message from John",
  data: { messageId: "123", senderId: "456" },
  image: "https://acme.com/notification.png",
  icon: "https://acme.com/icon.png",
}));
```

| Output | Type | Required |
| --- | --- | --- |
| `title` | `string` | Yes |
| `body` | `string` | Yes |
| `data` | `Record<string, unknown>` | No |
| `image` | `string` | No |
| `icon` | `string` | No |

### `step.chat`

```typescript
await step.chat("notify", async () => ({
  body: "A new post has been created",
}));
```

| Output | Type | Required |
| --- | --- | --- |
| `body` | `string` | Yes |

For Slack `blocks`, Discord embeds, etc., use `providers` overrides — see below.

### `step.inApp`

```typescript
const { seen, read, lastSeenDate, lastReadDate } = await step.inApp("inbox", async () => ({
  subject: "Welcome to Acme!",
  body: "We are excited to have you on board.",
  avatar: "https://acme.com/avatar.png",
  redirect: { url: "/welcome", target: "_self" },
  primaryAction: {
    label: "Get Started",
    redirect: { url: "/get-started", target: "_self" },
  },
  secondaryAction: {
    label: "Learn More",
    redirect: { url: "/learn-more", target: "_self" },
  },
  data: { entityType: "user", entityId: payload.userId },
}));
```

| Output | Type | Required | Description |
| --- | --- | --- | --- |
| `body` | `string` | Yes | Main content (HTML allowed if `disableOutputSanitization: true`) |
| `subject` | `string` | No | Notification title |
| `avatar` | `string` | No | URL — overrides actor avatar |
| `redirect` | `{ url, target? }` | No | Click destination (`target` is `_self`/`_blank`/`_parent`/`_top`/`_unfencedTop`, default `_blank`) |
| `primaryAction` | `{ label, redirect? }` | No | Accent-colored CTA button |
| `secondaryAction` | `{ label, redirect? }` | No | Muted CTA button |
| `data` | `Record<string, scalar>` | No | Custom metadata (≤ 10 keys; strings ≤ 256 chars) |

| Result | Type | Description |
| --- | --- | --- |
| `seen` | `boolean` | True after the user views the notification in the Inbox |
| `read` | `boolean` | True after the user marks it read |
| `lastSeenDate` | `Date \| null` | When `seen` flipped to true |
| `lastReadDate` | `Date \| null` | When `read` flipped to true |

Use the result to drive `skip` on subsequent steps (e.g. don't email if already read).

## Action Steps

### `step.delay`

Pause workflow execution.

```typescript
await step.delay("wait", async () => ({
  unit: "days",
  amount: 1,
}));
```

| Output | Type | Required | Notes |
| --- | --- | --- | --- |
| `amount` | `number` | Yes | Number of `unit`s |
| `unit` | `'seconds' \| 'minutes' \| 'hours' \| 'days' \| 'weeks' \| 'months'` | Yes | Time unit |

Returns: `{ duration: number }` (in milliseconds).

If a delay step **fails**, the workflow stops — it does not proceed to the next step.

### `step.digest`

Aggregate triggers over a time window or cron schedule.

```typescript
const { events } = await step.digest("daily", async () => ({
  unit: "days",
  amount: 1,
  digestKey: payload.projectId, // optional — group by custom key
}));
```

| Output | Type | Required | Notes |
| --- | --- | --- | --- |
| `amount` | `number` | One of (`amount`+`unit`) **or** (`cron`) | |
| `unit` | `'seconds' \| 'minutes' \| 'hours' \| 'days' \| 'weeks' \| 'months'` | | |
| `cron` | `string` | | Cron expression (e.g. `"0 0 * * *"`) |
| `digestKey` | `string` | No | Group key in addition to `subscriberId` |

| Result | Type | Description |
| --- | --- | --- |
| `events` | `DigestEvent[]` | Array of digested triggers |

Each `DigestEvent` is `{ id: string, time: Date, payload: object }`.

Constraints:
- **One digest step per workflow.** For two-stage digests, trigger a second workflow from `step.custom`.
- Digest content captured at trigger time — editing the workflow doesn't affect events already in flight.
- Digest results are not available in step controls — only inside subsequent step `resolver`/`providers`/`skip` callbacks.

### `step.custom`

Run arbitrary code and persist its output.

```typescript
const result = await step.custom("fetch", async () => {
  const r = await fetch("https://api.example.com/users/123");

  return await r.json();
}, {
  outputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      email: { type: "string" },
    },
    required: ["name", "email"],
  } as const,
});
```

| Option | Type | Description |
| --- | --- | --- |
| `outputSchema` | `JsonSchema \| ZodSchema` | Validates and types the return value (defaults to `unknown` if omitted) |

The return value must be JSON-serializable. The result is persisted in durable execution context and re-used on retries.

### `step.http`

Call an external HTTP endpoint as part of the workflow — for fetching just-in-time data, posting to a webhook, or fanning out to a downstream service.

```typescript
const plan = await step.http("fetch-plan", async () => ({
  method: "GET",
  url: `https://api.example.com/users/${payload.userId}/plan`,
  headers: [{ key: "Authorization", value: "Bearer xxxxx" }],
  responseBodySchema: {
    type: "object",
    properties: {
      planName: { type: "string" },
      renewalDate: { type: "string" },
    },
    required: ["planName", "renewalDate"],
  } as const,
}));

await step.email("notify", async () => ({
  subject: `Your ${plan.planName} plan`,
  body: `Your plan renews on ${plan.renewalDate}.`,
}));
```

Webhook-style fan-out:

```typescript
await step.http("webhook", async () => ({
  method: "POST",
  url: payload.webhookUrl,
  headers: [{ key: "Content-Type", value: "application/json" }],
  body: [
    { key: "event", value: "payment_failed" },
    { key: "subscriberId", value: subscriber.subscriberId },
  ],
  continueOnFailure: true,
}));
```

| Output | Type | Required | Notes |
| --- | --- | --- | --- |
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'` | Yes | HTTP verb |
| `url` | `string` | Yes | Fully qualified URL. Liquid templating is allowed (`{{payload.webhookUrl}}`). |
| `headers` | `Array<{ key: string; value: string }>` | No | Outgoing headers |
| `body` | `Array<{ key: string; value: string }>` | No | Form-style body. Use the SDK's typed body for JSON payloads. |
| `responseBodySchema` | `JsonSchema \| ZodSchema` | Required if downstream steps reference response data | Declares which response properties are addressable |
| `continueOnFailure` | `boolean` | No | If `true`, a non-2xx response does not stop the workflow. Default `false`. |

Constraints:

- **`responseBodySchema` is required** when subsequent steps reference response data. Only properties declared in the schema are available as `{{ steps.<http-step-id>.<property> }}` (Dashboard) or as typed fields on the returned object (Framework).
- The HTTP step participates in retries. Treat it as a side effect — if you need exactly-once external calls, prefer `step.custom` with your own idempotency key.
- The Liquid `{{subscriber.*}}` and `{{payload.*}}` variables are usable inside `url`, `headers`, and `body` values.

## Step Options

```typescript
await step.<channel>(stepId, resolver, {
  controlSchema,
  skip,
  providers,
  disableOutputSanitization,
});
```

### `controlSchema`

Defines no-code controls editable in the Dashboard. Pass a Zod schema, JSON Schema (`as const`), or Class-Validator class.

```typescript
await step.email("welcome", async (controls) => ({
  subject: controls.subject,
  body: render(<Email hideBanner={controls.hideBanner} />),
}), {
  controlSchema: z.object({
    hideBanner: z.boolean().default(false),
    subject: z.string().default("Hi {{subscriber.firstName | capitalize}}"),
  }),
});
```

Control values support [LiquidJS templating](https://liquidjs.com/filters/overview.html):
- `{{subscriber.firstName}}`
- `{{payload.userId}}`
- `{{payload.invoiceDate | date: '%b %d, %y'}}`
- `{{subscriber.firstName | capitalize | append: '!'}}`

### `skip`

Skip a step based on dynamic logic.

```typescript
await step.email("follow-up", resolver, {
  skip: () => inAppNotification.read === true,
});

// Or based on subscriber data
await step.email("upsell", resolver, {
  skip: () => subscriber.data?.tier === "enterprise",
});
```

The function receives the resolved controls and returns `boolean | Promise<boolean>`.

### `providers` (Per-Step Overrides)

Override the request sent to the underlying provider SDK.

```typescript
await step.chat("notify", resolver, {
  providers: {
    slack: ({ controls, outputs }) => ({
      text: outputs.body,
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: `*New post:* ${outputs.body}` },
        },
      ],
    }),
  },
});
```

```typescript
await step.email("alert", resolver, {
  providers: {
    sendgrid: ({ controls, outputs }) => ({
      from: "alerts@acme.com",
      cc: ["ops@acme.com"],
      _passthrough: {
        body: { ip_pool_name: "transactional" },
        headers: { "X-Custom": "value" },
        query: { foo: "bar" },
      },
    }),
  },
});
```

The `_passthrough` block deep-merges into the final provider request — typed provider keys take precedence over `_passthrough`.

### `disableOutputSanitization`

Allow raw HTML / unescaped characters in step output.

```typescript
await step.inApp("link", async () => ({
  body: "Check it out",
  data: { link: "/p/123?active=true&env=prod" }, // & gets escaped by default
}), { disableOutputSanitization: true });
```

For Inbox HTML rendering, also use `dangerouslySetInnerHTML` in `renderBody` / `renderSubject` (see [`inbox-integration`](../../inbox-integration)).

## Conditional Patterns

### Send email only if in-app wasn't seen

```typescript
const inAppNotification = await step.inApp("inbox", async () => ({
  subject: "Task reminder!",
  body: "Task is not yet complete.",
}));

await step.delay("wait-6h", async () => ({ unit: "hours", amount: 6 }));

await step.email("email-fallback", async () => ({
  subject: "Task reminder!",
  body: "Task is not yet complete.",
}), {
  skip: () => inAppNotification.read === true,
});
```

### Skip delay for premium users

```typescript
await step.delay("wait", async () => ({ unit: "hours", amount: 24 }), {
  skip: async () => subscriber.data?.tier === "premium",
});
```

### Branch on a fetched value

```typescript
const task = await step.custom("fetch-task", async () => {
  const t = await db.fetchTask(payload.taskId);

  return { id: t.id, complete: t.complete, title: t.title };
}, {
  outputSchema: {
    type: "object",
    properties: {
      id: { type: "string" },
      complete: { type: "boolean" },
      title: { type: "string" },
    },
    required: ["id", "complete"],
  } as const,
});

await step.email("reminder", async () => ({
  subject: `Reminder: ${task.title}`,
  body: "Please complete your task.",
}), {
  skip: () => task.complete,
});
```

## Failure & Retries

- If a **delay** or **digest** step fails, the workflow stops — subsequent steps do not run.
- If a **channel** step fails delivery, retries depend on provider config and Novu's retry policy.
- Workflow handlers may be re-invoked on retry. Keep them deterministic — push side effects into `step.custom` so the result is persisted in durable context.

## Type Inference

When `payloadSchema` and `controlSchema` are provided as Zod or JSON Schema (with `as const`), `payload` and `controls` are fully typed:

```typescript
workflow("typed", async ({ step, payload }) => {
  // payload.userId is `string` (inferred from Zod schema below)
  await step.email("greet", async (controls) => ({
    // controls.subject is `string` (inferred from Zod schema below)
    subject: controls.subject,
    body: `Hi ${payload.firstName}`,
  }), {
    controlSchema: z.object({ subject: z.string().default("Hi") }),
  });
}, {
  payloadSchema: z.object({
    userId: z.string(),
    firstName: z.string(),
  }),
});
```

If you don't supply a schema, `payload` and `controls` are `unknown`.

## Appendix: Step Conditions (Dashboard JSON-Logic ↔ Framework `skip`)

Dashboard authors gate a step with [JSON-Logic](https://jsonlogic.com) on `step.condition`. Framework authors pass a `skip: () => boolean` callback. The semantics are inverse — Dashboard runs when the condition is `true`, Framework `skip` skips when the callback returns `true`.

| Intent                                       | Dashboard JSON-Logic                                                                  | Framework `skip`                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Run only when subscriber is offline          | `{ "==": [{ "var": "subscriber.isOnline" }, "false"] }`                               | `skip: ({ subscriber }) => subscriber.isOnline === true` |
| Run only when In-App not read                | `{ "==": [{ "var": "steps.<inAppId>.read" }, "false"] }`                              | `skip: () => inAppResult.read === true`         |
| Run only when In-App not seen                | `{ "==": [{ "var": "steps.<inAppId>.seen" }, "false"] }`                              | `skip: () => inAppResult.seen === true`         |
| Run only for workflows tagged `billing`     | `{ "in": ["billing", { "var": "workflow.tags" }] }`                                   | (filter at trigger time)                        |
| Run only when HTTP `status == "active"`      | `{ "==": [{ "var": "steps.<httpId>.status" }, "active"] }`                            | `skip: () => httpResult.status !== "active"`    |

Variables you can reference in either surface (full breakdown in [`design-workflow/references/step-conditions.md`](../../design-workflow/references/step-conditions.md)):

- `workflow.*` — `workflowId`, `name`, `description`, `tags`, `severity`
- `subscriber.*` — `subscriberId`, `firstName`, `lastName`, `email`, `phone`, `avatar`, `locale`, `timezone`, `isOnline`, `lastOnlineAt`, `data.*`
- `payload.*` — any field declared in `payloadSchema`
- `steps.<stepId>.*` — In-App `seen` / `read`, digest `events` / `eventCount`, HTTP properties declared in `responseBodySchema`
- `context.*` — multi-tenant metadata passed at trigger time (tenant, region, app)

> See [`design-workflow/references/step-conditions.md`](../../design-workflow/references/step-conditions.md) for the full list of canonical conditions and the design reasoning.
