---
name: novu-framework-integration
description: Build code-first notification workflows with @novu/framework. Use when defining workflows in TypeScript (Zod / JSON Schema / Class Validator), composing channel steps (email, SMS, push, chat, in-app) with action steps (delay, digest, custom), exposing Step Controls for non-technical teammates, rendering React/Vue/Svelte Email templates, hosting the Bridge Endpoint inside Next.js, Express, NestJS, Remix, Nuxt, SvelteKit, H3, or AWS Lambda, syncing to Novu Cloud via CLI / GitHub Actions, securing production with HMAC, or implementing translations, hydration, multi-channel orchestration, and LLM-powered notification logic in code.
inputs:
  - name: NOVU_SECRET_KEY
    description: "Server-side API key from https://dashboard.novu.co/api-keys. Used by @novu/framework and the Bridge Endpoint."
    required: true
    type: secret
---

# Framework Integration

Use `@novu/framework` to build notification workflows **in code**, alongside your application source. Workflows live in your repo, content is rendered using libraries you already use (React Email, Vue Email, Svelte Email), and a single HTTP endpoint (the Bridge) lets Novu Cloud execute them with just-in-time data from your services.

> Use this skill when building workflows **in code**. For workflows authored in the Novu Dashboard, just trigger them via [`trigger-notification`](../trigger-notification) — no Framework needed.

## When to Use the Framework

| Use Framework | Use Dashboard Workflows |
| --- | --- |
| Workflows must live in source control / GitOps | Non-technical peers own all the content |
| Need just-in-time data from your DB / APIs | All data fits in the trigger payload |
| Render emails with React/Vue/Svelte Email | Block editor is enough |
| Execute custom code (LLMs, third-party APIs) | Pure send-only flows |
| Need typed payload + step controls | Quick prototype |

The two approaches **coexist** — a single environment can have both code-defined and dashboard-defined workflows.

## How It Works

1. You define workflows in code with `workflow(...)` from `@novu/framework`.
2. You expose a single `/api/novu` HTTP route in your app — the **Bridge Endpoint**.
3. You sync the bridge URL to Novu Cloud (via `npx novu sync` or GitHub Action).
4. Novu Cloud calls your bridge over an authenticated tunnel during workflow execution to fetch step content with the latest data.

```
Trigger ──► Novu Cloud Worker ──► Your Bridge (/api/novu) ──► Provider (SendGrid, FCM, …)
```

## Quick Start

### 1. Bootstrap a project

```bash
npx novu init --secret-key=<YOUR_NOVU_SECRET_KEY>
```

This creates a sample bridge app with a workflow, env file, and a working `/api/novu` route.

### 2. Or add to an existing app

```bash
npm install @novu/framework zod @react-email/components react-email
```

```bash
NOVU_SECRET_KEY=<YOUR_NOVU_SECRET_KEY>
```

### 3. Define a workflow

```typescript
import { workflow } from "@novu/framework";
import { z } from "zod";

export const welcomeWorkflow = workflow(
  "welcome-email",
  async ({ step, payload, subscriber }) => {
    await step.email("send-email", async (controls) => {
      return {
        subject: controls.subject,
        body: `Welcome ${subscriber.firstName ?? payload.userName}!`,
      };
    }, {
      controlSchema: z.object({
        subject: z.string().default("Welcome to {{payload.appName}}"),
      }),
    });
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      appName: z.string().default("Acme"),
    }),
    name: "Welcome Email",
    description: "Sent when a new user signs up",
    tags: ["onboarding"],
  }
);
```

### 4. Mount the Bridge Endpoint

Pick the wrapper that matches your framework — see [Bridge Endpoint Setup](#bridge-endpoint-setup) below.

### 5. Run the Local Studio

```bash
npx novu@latest dev --port <YOUR_APP_PORT>
```

Open `http://localhost:2022` to preview workflows, edit controls, and trigger test events. The Studio creates a public tunnel automatically so Novu Cloud can reach your local bridge.

## Workflow Anatomy

> Designing the workflow itself? See [`design-workflow/`](../design-workflow) for channel selection, severity, `critical`, digest defaults, step conditions, and the 9 reference templates (order confirmation, payment failed, account suspended, comment, trial expiring, password reset, webhook fan-out, fetch-then-notify). The Framework SKILL covers **how to express** those decisions in code; `design-workflow/` covers **what to decide**.

```typescript
workflow(workflowId, handler, options);
```

| Param | Type | Description |
| --- | --- | --- |
| `workflowId` | `string` | Unique identifier in your environment |
| `handler` | `({ step, payload, subscriber }) => Promise<void>` | Workflow body — calls steps in order |
| `options` | `WorkflowOptions` | Schema, name, description, tags, preferences |

### Workflow Options

| Option | Type | Purpose |
| --- | --- | --- |
| `payloadSchema` | `ZodSchema \| JsonSchema \| ClassValidatorClass` | Validates the trigger payload, infers TS type for `payload` |
| `name` | `string` | Human-readable name shown in Dashboard / `<Inbox />` |
| `description` | `string` | Description shown in Dashboard |
| `tags` | `string[]` | Categorize for filtering / Inbox tabs |
| `severity` | `'low' \| 'medium' \| 'high'` | Visual prioritization in the Inbox. Leave unset for most workflows. |
| `critical` | `boolean` | Bypasses subscriber preferences, skips digest, runs without delays. Reserve for must-deliver events. |
| `preferences` | `WorkflowPreferences` | Default channel preferences and `readOnly` flag |

### Workflow Context

The handler receives `{ step, payload, subscriber }`:

- `step` — channel and action step builders (`step.email`, `step.delay`, `step.digest`, …)
- `payload` — strongly-typed data passed at trigger time, validated against `payloadSchema`
- `subscriber` — `{ subscriberId, firstName?, lastName?, locale?, data?, ... }` of the recipient

## Channel Steps

All channel steps share the same shape:

```typescript
await step.<channel>(stepId, resolver, options?);
```

| Step | Output Required | Notable Outputs | Returns Result |
| --- | --- | --- | --- |
| `step.email` | `subject`, `body` | `attachments`, `from`, `replyTo` | No |
| `step.sms` | `body` | — | No |
| `step.push` | `title` (or `subject`), `body` | `data`, `image`, `icon` | No |
| `step.chat` | `body` | — (override per-provider) | No |
| `step.inApp` | `body` | `subject`, `avatar`, `redirect`, `primaryAction`, `secondaryAction`, `data` | `{ seen, read, lastSeenDate, lastReadDate }` |

### Email Step

```typescript
await step.email("welcome", async (controls) => ({
  subject: controls.subject,
  body: render(<WelcomeEmail name={subscriber.firstName} />),
  from: "hello@acme.com",
  replyTo: "support@acme.com",
}));
```

### In-App Step (rich payload)

```typescript
await step.inApp("inbox", async () => ({
  subject: "Welcome to Acme!",
  body: "We are excited to have you on board.",
  avatar: "https://acme.com/avatar.png",
  redirect: { url: "/welcome", target: "_self" },
  primaryAction: {
    label: "Get Started",
    redirect: { url: "/get-started", target: "_self" },
  },
  data: { entityType: "user", entityId: payload.userId },
}));
```

The In-App step **returns** `{ seen, read, lastSeenDate, lastReadDate }` — use it to drive the `skip` of subsequent steps.

### SMS / Push / Chat

```typescript
await step.sms("verification", async () => ({
  body: `Your code is ${payload.code}`,
}));

await step.push("new-message", async () => ({
  title: "New message",
  body: payload.preview,
  data: { messageId: payload.id },
}));

await step.chat("notify", async () => ({
  body: `:rocket: Deploy ${payload.id} succeeded`,
}));
```

## Action Steps

### `step.delay`

Pause workflow execution before the next step.

```typescript
await step.delay("wait-a-day", async () => ({
  unit: "days",
  amount: 1,
}));
```

Supported `unit` values: `seconds`, `minutes`, `hours`, `days`, `weeks`, `months`.

### `step.digest`

Aggregate multiple triggers into a single notification over a window.

```typescript
const { events } = await step.digest("daily", async () => ({
  unit: "days",
  amount: 1,
  digestKey: payload.projectId, // optional — group by custom key
}));

await step.email("summary", async () => ({
  subject: `${events.length} updates today`,
  body: render(<DigestEmail events={events} />),
}));
```

Use `cron: "0 0 * * *"` instead of `unit`/`amount` for cron-based digests. Each digest event has `{ id, time, payload }`. **Only one digest per workflow** — chain a second workflow via `step.custom` if you need a two-stage digest.

### `step.http`

Call an external HTTP endpoint as part of the workflow — webhook fan-out or just-in-time data fetch.

```typescript
const plan = await step.http("fetch-plan", async () => ({
  method: "GET",
  url: `https://api.example.com/users/${payload.userId}/plan`,
  responseBodySchema: {
    type: "object",
    properties: { planName: { type: "string" }, renewalDate: { type: "string" } },
    required: ["planName", "renewalDate"],
  } as const,
}));

await step.email("notify", async () => ({
  subject: `Your ${plan.planName} plan`,
  body: `Renews on ${plan.renewalDate}.`,
}));
```

Webhook-style:

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

When a subsequent step references HTTP response data, the HTTP step **must** declare a `responseBodySchema`. Only properties declared in the schema are addressable as `{{ steps.<http-step-id>.<property> }}`.

### `step.custom`

Run arbitrary code and persist its result for later steps.

```typescript
const task = await step.custom("fetch-task", async () => {
  const t = await db.fetchTask(payload.taskId);
  return { id: t.id, title: t.title, complete: t.complete };
}, {
  outputSchema: {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      complete: { type: "boolean" },
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

The custom step result is **only** usable inside subsequent step `resolver`, `providers`, and `skip` functions — not in step controls.

## Step Options

```typescript
await step.email(stepId, resolver, {
  controlSchema,         // Zod | JSON Schema | Class-Validator class
  skip,                  // (controls) => boolean | Promise<boolean>
  providers,             // per-provider override callbacks
  disableOutputSanitization, // boolean — for raw HTML in Inbox
});
```

### `skip`

Conditionally skip a step. Receives the resolved controls.

```typescript
await step.email("follow-up", resolver, {
  skip: () => inAppNotification.read === true,
});
```

### `providers` (Per-Step Provider Overrides)

Customize the request sent to the underlying provider — e.g. Slack `blocks` or SendGrid `cc`.

```typescript
await step.email("alert", resolver, {
  providers: {
    sendgrid: ({ controls, outputs }) => ({
      from: "alerts@acme.com",
      cc: ["ops@acme.com"],
      _passthrough: {
        body: { ip_pool_name: "transactional" },
        headers: { "X-Custom": "value" },
      },
    }),
  },
});
```

`_passthrough` deep-merges into the final provider request — typed provider keys take precedence over `_passthrough`.

### `disableOutputSanitization`

Allow raw HTML / unescaped characters in the output (e.g. `&` in In-App `data.link`):

```typescript
await step.inApp("link", async () => ({
  body: "Check it out",
  data: { link: "/p/123?active=true&env=prod" },
}), { disableOutputSanitization: true });
```

## Payload Schema

The payload is the data passed at trigger time. Define a schema to get typed `payload` and runtime validation.

### With Zod

```typescript
import { z } from "zod";

workflow("comment", handler, {
  payloadSchema: z.object({
    postId: z.number(),
    authorName: z.string(),
    comment: z.string().max(200),
  }),
});
```

### With JSON Schema

```typescript
workflow("comment", handler, {
  payloadSchema: {
    type: "object",
    properties: {
      postId: { type: "number" },
      authorName: { type: "string" },
      comment: { type: "string", maxLength: 200 },
    },
    required: ["postId", "comment"],
    additionalProperties: false,
  } as const,
});
```

> The `as const` is required for TS to infer the payload type from JSON Schema.

### With Class Validator

```typescript
import { IsString, IsNumber } from "class-validator";

class CommentPayload {
  @IsNumber() postId!: number;
  @IsString() authorName!: string;
  @IsString() comment!: string;
}

workflow("comment", handler, { payloadSchema: CommentPayload });
```

Requires `class-validator`, `class-validator-jsonschema`, `reflect-metadata`. See [`references/schema-validation.md`](./references/schema-validation.md).

## Step Controls — No-Code for Your Team

Controls are step-level inputs your non-technical peers can edit in the Novu Dashboard UI without touching code. They're validated by a schema you define (Zod / JSON Schema / Class-Validator).

```typescript
await step.email("welcome", async (controls) => ({
  subject: controls.subject,
  body: render(<EmailTemplate hideBanner={controls.hideBanner} />),
}), {
  controlSchema: z.object({
    hideBanner: z.boolean().default(false),
    subject: z.string().default("Hi {{subscriber.firstName | capitalize}}"),
  }),
});
```

### Variables in Controls

Control values support [LiquidJS](https://liquidjs.com/filters/overview.html) templating:

- `{{subscriber.firstName}}` — any subscriber attribute
- `{{payload.userId}}` — any payload field defined in `payloadSchema`
- `{{payload.invoiceDate | date: '%a, %b %d, %y'}}` — Liquid filters
- `{{subscriber.firstName | append: ': ' | append: payload.status | capitalize}}` — chained filters

Type `{{` in the Dashboard UI to autocomplete available variables.

### Controls vs Payload

| | Controls | Payload |
| --- | --- | --- |
| Edited by | Non-technical peers in Dashboard | Developers in code |
| Schema | `controlSchema` per step | `payloadSchema` per workflow |
| Persistence | Stored in Novu Cloud per environment | Sent at trigger time |
| Use case | Subject, copy, styling, behaviour toggles | Dynamic per-trigger data |

## Workflow Preferences

Define default channel preferences in code. See [`manage-preferences`](../manage-preferences) for the full preference resolution model.

```typescript
workflow("system-alert", handler, {
  preferences: {
    all: { enabled: true, readOnly: false },
    channels: {
      email: { enabled: true },
      sms: { enabled: false },
      inApp: { enabled: true },
    },
  },
});
```

- `all.readOnly: true` makes the workflow **critical** — subscribers cannot disable it.
- `all.enabled` is the fallback for any channel not in `channels`.
- Default if omitted: `enabled: true`, `readOnly: false` for all channels.

## Bridge Endpoint Setup

The Bridge is a single HTTP route (`/api/novu` by default) where Novu Cloud calls your app to:
- Discover registered workflows (`GET`)
- Resolve step content for a given subscriber + payload (`POST`)
- Verify HMAC signatures on requests

Each framework ships a `serve` wrapper that handles parsing, HMAC verification, and response shaping.

### Next.js (App Router)

```typescript
import { serve } from "@novu/framework/next";
import { welcomeWorkflow } from "@/novu/workflows";

export const { GET, POST, OPTIONS } = serve({
  workflows: [welcomeWorkflow],
});
```

### Next.js (Pages Router)

```typescript
import { serve } from "@novu/framework/next";
import { welcomeWorkflow } from "../../novu/workflows";

export default serve({ workflows: [welcomeWorkflow] });
```

### Express

```typescript
import express from "express";
import { serve } from "@novu/framework/express";
import { welcomeWorkflow } from "./novu/workflows";

const app = express();
app.use(express.json()); // required
app.use("/api/novu", serve({ workflows: [welcomeWorkflow] }));
app.listen(4000);
```

### NestJS

```typescript
import { Module } from "@nestjs/common";
import { NovuModule } from "@novu/framework/nest";
import { welcomeWorkflow } from "./novu/workflows";

@Module({
  imports: [
    NovuModule.register({
      apiPath: "/api/novu",
      workflows: [welcomeWorkflow],
    }),
  ],
})
export class AppModule {}
```

For dependency injection, use `NovuModule.registerAsync` — see [`references/bridge-endpoint.md`](./references/bridge-endpoint.md).

### Remix

```typescript
import { serve } from "@novu/framework/remix";
import { welcomeWorkflow } from "../novu/workflows";

const handler = serve({ workflows: [welcomeWorkflow] });
export { handler as action, handler as loader };
```

### SvelteKit

```typescript
import { serve } from "@novu/framework/sveltekit";
import { welcomeWorkflow } from "$lib/novu/workflows";

export const { GET, POST, OPTIONS } = serve({ workflows: [welcomeWorkflow] });
```

### Nuxt

```typescript
import { serve } from "@novu/framework/nuxt";
import { welcomeWorkflow } from "~/novu/workflows";

export default defineEventHandler(serve({ workflows: [welcomeWorkflow] }));
```

### H3

```typescript
import { createApp, eventHandler, toNodeListener } from "h3";
import { createServer } from "node:http";
import { serve } from "@novu/framework/h3";
import { welcomeWorkflow } from "./novu/workflows";

const app = createApp();
app.use("/api/novu", eventHandler(serve({ workflows: [welcomeWorkflow] })));
createServer(toNodeListener(app)).listen(4000);
```

### AWS Lambda

```typescript
import { serve } from "@novu/framework/lambda";
import { welcomeWorkflow } from "./novu/workflows";

export const novu = serve({ workflows: [welcomeWorkflow] });
```

### Custom (any framework)

```typescript
import { NovuRequestHandler, ServeHandlerOptions } from "@novu/framework";

export const serve = (options: ServeHandlerOptions) =>
  new NovuRequestHandler({
    frameworkName: "my-framework",
    ...options,
    handler: (req, res) => ({ /* method, headers, body, url, transformResponse */ }),
  }).createHandler();
```

See [`references/bridge-endpoint.md`](./references/bridge-endpoint.md) for the full custom handler signature.

## Local Studio

Live preview of your workflows with a public tunnel for Novu Cloud to reach your machine.

```bash
npx novu@latest dev
# Defaults: --port 4000  --route /api/novu  --studio-port 2022
```

Then open `http://localhost:2022` (Chrome only).

### CLI Flags

| Flag | Default | Purpose |
| --- | --- | --- |
| `-p`, `--port` | `4000` | Your app's port |
| `-r`, `--route` | `/api/novu` | Bridge route path |
| `-o`, `--origin` | `http://localhost` | Bridge origin |
| `-d`, `--dashboard-url` | `https://dashboard.novu.co` | Dashboard URL — use `https://eu.dashboard.novu.co` for EU |
| `-sp`, `--studio-port` | `2022` | Studio UI port |
| `-t`, `--tunnel` | auto | Self-hosted tunnel URL (e.g. ngrok) |
| `-H`, `--headless` | `false` | Skip the Studio UI |

```bash
npx novu@latest dev --port 3002 --dashboard-url https://eu.dashboard.novu.co
```

The Studio:
- Auto-creates a stable tunnel URL like `https://<id>.novu.sh/api/novu`
- Lets you edit Step Controls and Payload to preview different states
- Runs against `process.env.NODE_ENV=development` — HMAC verification is **off** to allow Studio access
- Has a "Sync" button to push state to Cloud (use CI/CD for real deployments)

## Triggering Workflows

Code-defined workflows are triggered the same way as Dashboard workflows — using `@novu/api` from your trigger surface (server, queue worker, webhook handler):

```typescript
import { Novu } from "@novu/api";
const novu = new Novu({ secretKey: process.env.NOVU_SECRET_KEY });

await novu.trigger({
  workflowId: "welcome-email",
  to: { subscriberId: "user-123", email: "jane@acme.com" },
  payload: { userName: "Jane", appName: "Acme" },
});
```

You can also trigger a workflow from inside a `step.custom` of another workflow:

```typescript
await step.custom("trigger-summary", async () => {
  return await summaryWorkflow.trigger({
    to: subscriber.subscriberId,
    payload: { events: events.map(e => e.payload) },
  });
});
```

See [`trigger-notification`](../trigger-notification) for full trigger options (bulk, broadcast, topics, overrides, transactionId, cancel).

## React Email (and friends)

Render emails using your existing component library.

### React Email

```bash
npm install @react-email/components react-email
```

```tsx
import { Body, Container, Head, Html, render } from "@react-email/components";

export const WelcomeEmail = ({ name }: { name: string }) => (
  <Html>
    <Head />
    <Body>
      <Container>Hello {name}, welcome!</Container>
    </Body>
  </Html>
);

export const renderWelcome = (name: string) => render(<WelcomeEmail name={name} />);
```

```typescript
await step.email("welcome", async () => ({
  subject: "Welcome",
  body: renderWelcome(payload.userName),
}));
```

Vue Email, Svelte Email, and Remix + React Email are also supported. See [`references/email-templates.md`](./references/email-templates.md).

## Translations (i18n)

For Framework-based workflows, translation lives in your code (not in the Novu Translation system, which targets Dashboard workflows). Use any i18n library (e.g. i18next) and resolve content from `subscriber.locale` inside the resolver.

```typescript
import { workflow } from "@novu/framework";
import i18n from "./i18n";

export const localizedWorkflow = workflow(
  "welcome-localized",
  async ({ step, subscriber }) => {
    await step.email("email", async (controls) => {
      const t = i18n.getFixedT([subscriber.locale ?? controls.defaultLocale]);
      return {
        subject: t("welcomeEmailSubject", { username: subscriber.firstName }),
        body: render(<Welcome subject={t("subject")} body={t("body")} />),
      };
    }, {
      controlSchema: z.object({
        defaultLocale: z.string().default("en_US"),
      }),
    });
  },
);
```

See [`references/translations.md`](./references/translations.md) for a complete i18next + React Email example.

## Tags

Tag a workflow to group it with related notifications (used by Inbox tabs and Dashboard filtering):

```typescript
workflow("login-alert", handler, { tags: ["security"] });
workflow("password-change", handler, { tags: ["security"] });
```

In the Inbox, render a "Security" tab with `tabs={[{ label: "Security", filter: { tags: ["security"] } }]}` (see [`inbox-integration`](../inbox-integration)).

## Deployment

### Sync via CLI

Push your workflows to Novu Cloud:

```bash
npx novu@latest sync \
  --bridge-url https://api.acme.com/api/novu \
  --secret-key $NOVU_SECRET_KEY \
  --api-url https://api.novu.co  # use https://eu.api.novu.co for EU
```

### GitHub Actions

```yaml
name: Sync Novu Workflows
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: novuhq/actions-novu-sync@v2
        with:
          secret-key: ${{ secrets.NOVU_SECRET_KEY }}
          bridge-url: ${{ secrets.NOVU_BRIDGE_URL }}
          api-url: https://api.novu.co
```

### GitOps Workflow

1. Develop locally with the Studio against your own machine.
2. Open a PR — CI runs `npx novu sync` against the **Development** environment to test e2e.
3. Merge to `main` — CI runs `npx novu sync` against **Production**.

GitLab CI, Jenkins, CircleCI, Bitbucket, Azure DevOps, and Travis CI all work via the CLI.

## Production & Security

- **Bridge URL must be publicly reachable** over HTTPS. Novu Cloud auto-scales — no IP allowlist is published.
- **HMAC verification is on by default** when `NODE_ENV !== "development"`. The `serve` wrapper handles this — you don't need to write any code. Each request includes a `Novu-Signature` header (`t=timestamp,v1=signature`) that's verified against `NOVU_SECRET_KEY`.
- **Disable HMAC for local dev** automatically via `NODE_ENV=development`. Don't disable it in production.
- **Vercel Preview URLs** are protected by default — enable [Protection Bypass for Automation](https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection) and pass the bypass token as `?x-vercel-protection-bypass=<token>` in your bridge URL.

### Custom Client

Override defaults globally:

```typescript
import { Client as NovuFrameworkClient } from "@novu/framework";
import { serve } from "@novu/framework/next";

export const { GET, POST, OPTIONS } = serve({
  client: new NovuFrameworkClient({
    secretKey: process.env.NOVU_SECRET_KEY,
    strictAuthentication: false, // disables HMAC — only for local dev
  }),
  workflows: [/* … */],
});
```

Environment variables read by the Client:
- `NOVU_SECRET_KEY` — your secret key
- `NOVU_API_URL` — defaults to `https://api.novu.co` (use `https://eu.api.novu.co` for EU)

## Common Pitfalls

1. **Bridge URL must be publicly reachable** — `localhost` won't work for Novu Cloud. Use the Studio tunnel locally; deploy publicly for production.
2. **`workflowId` is the trigger identifier** — same id you'll pass to `novu.trigger({ workflowId })`. Use kebab-case and keep it stable.
3. **Step `id`s must be unique within a workflow** — duplicates throw at registration.
4. **`as const` on JSON Schema** — without it, TS infers `string` instead of literal types and `payload` becomes `unknown`.
5. **Only one `step.digest` per workflow** — chain a second workflow via `step.custom` for two-stage digest patterns.
6. **Digest / delay results from one trigger don't influence other triggers** — they're per workflow run.
7. **Custom step results aren't usable in step controls** — only in subsequent step `resolver`, `providers`, or `skip` callbacks.
8. **Sync after every workflow change** — Novu Cloud needs to know about new/renamed workflows and updated control schemas. Add `npx novu sync` to your CI/CD.
9. **HMAC fails locally if `NODE_ENV !== "development"`** — set it to `development` for the Studio to reach your bridge, or disable strict auth in your `Client`.
10. **Don't store the `secretKey` in the client bundle** — it's server-only. Keep workflows + bridge route inside server code, not in any `"use client"` module.
11. **Provider override `_passthrough` is unvalidated** — typos won't error at compile time. Use known typed provider keys whenever possible.
12. **Changing a delay/digest step's content does not affect already-scheduled events** — content is captured at the time of the original trigger.
13. **Workflow handlers must be deterministic across retries** — Novu re-invokes the bridge to resolve step content. Avoid side-effects outside `step.custom` (custom is the only step whose result is durably persisted).
14. **`@novu/framework` requires Node.js ≥ 20**.

## Code Style Tips

- One file per workflow under `src/novu/workflows/<workflow-id>.ts`, re-exported from a barrel `src/novu/workflows/index.ts`.
- Prefer **Zod** schemas — best autocomplete and inference. Use JSON Schema only when you need features Zod doesn't expose (`oneOf`, `if/then/else`, `$ref`).
- Co-locate React Email templates next to the workflow that uses them (`src/novu/workflows/welcome/template.tsx`).
- Wrap shared `step.custom` logic into helpers (`fetchUser(payload.userId)`) for reuse.
- For NestJS, use `NovuModule.registerAsync` with a `NotificationService` so workflow definitions can inject services.

## References

- [Bridge Endpoint Setup](./references/bridge-endpoint.md) — every framework wrapper, custom `serve`, NestJS DI
- [Workflow & Step API](./references/workflow-and-steps.md) — full options, all step types, conditional logic patterns
- [Schema Validation](./references/schema-validation.md) — Zod, JSON Schema, Class Validator deep dive
- [Email Templates](./references/email-templates.md) — React, Vue, Svelte Email integrations
- [Translations](./references/translations.md) — i18next-based localized workflows
- [Local Studio & CLI](./references/studio-and-cli.md) — every flag, tunnel modes, headless mode
- [Deployment](./references/deployment.md) — `npx novu sync`, GitHub Action, GitOps recipe, EU region
- [Production & Security](./references/security.md) — HMAC, public bridge requirements, Vercel preview bypass
- [Examples Cookbook](./references/examples.md) — multi-step onboarding, digest, delay-then-skip, LLM-powered digest
