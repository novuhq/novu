---
name: framework-workflow
description: Author code-first Novu workflows using @novu/framework and expose them via a Next.js / Express / serverless bridge endpoint. Complements the official `trigger-notification` skill by covering the code-first workflow authoring path.
triggers:
  - create a code-first workflow
  - serve novu workflows from this app
  - prefer code over the dashboard
---

# Code-first workflows with `@novu/framework`

Use this skill when the user prefers to keep workflow definitions in source control rather than authoring them in the dashboard.

## 1. Install

```bash
pnpm add @novu/framework
```

## 2. Define a workflow

Create `app/novu/workflows.ts` (Next.js App Router):

```ts
import { workflow } from '@novu/framework';
import { z } from 'zod';

export const welcomeOnboardingEmail = workflow(
  'welcome-onboarding-email',
  async ({ step, payload }) => {
    await step.email('send-email', async () => {
      return {
        subject: `Welcome, ${payload.name}!`,
        body: `<p>Thanks for joining ${payload.productName}.</p>`,
      };
    });
  },
  {
    payloadSchema: z.object({
      name: z.string(),
      productName: z.string(),
    }),
  }
);
```

For richer email markup, use `@react-email/components` and render JSX inside the step body.

## 3. Expose the bridge endpoint (Next.js App Router)

Create `app/api/novu/route.ts`:

```ts
import { serve } from '@novu/framework/next';
import { welcomeOnboardingEmail } from '../../novu/workflows';

export const { GET, POST, OPTIONS } = serve({
  workflows: [welcomeOnboardingEmail],
});
```

For Pages Router use `@novu/framework/next` with the pages adapter; for Express use `@novu/framework/express`. Refer to the official docs if a different runtime is needed.

## 4. Sync the workflow with Novu Cloud

After deploying the bridge endpoint:

```bash
npx novu@latest sync \
  --bridge-url https://your-app.example.com/api/novu \
  --secret-key $NOVU_SECRET_KEY
```

For local development, run `npx novu@latest dev` to expose a tunnel to the bridge endpoint.

## 5. Trigger it

See the official `trigger-notification` skill. The `workflowId` is the first argument passed to `workflow(...)`.

## Verification checklist

- [ ] `@novu/framework` is installed.
- [ ] A bridge route is exposed at `/api/novu` (or equivalent for the framework).
- [ ] Each step has an explicit step id (`send-email`, etc).
- [ ] The payload is described with a `payloadSchema` (Zod) so the dashboard renders editable inputs.
