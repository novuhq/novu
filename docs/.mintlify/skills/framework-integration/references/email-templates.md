# Email Templates

`@novu/framework` lets you render emails with libraries you already know — React Email, Vue Email, Svelte Email — by returning the rendered HTML string from your `step.email` resolver.

## Why use a component library?

- **Reuse design tokens** across product UI and emails
- **Type safety** for template props
- **Dev-time preview** with React/Vue/Svelte Email's local preview servers
- **Avoid HTML email tag soup** — components abstract away `<table>`-based layouts

## React Email

### Install

```bash
npm install @react-email/components react-email
```

### Define a template

```tsx
// emails/welcome.tsx
import {
  Body,
  Container,
  Head,
  Html,
  render,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Body>
      <Container>
        Hello {name}, welcome to your first React Email template!
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail;

export function renderWelcome(name: string) {
  return render(<WelcomeEmail name={name} />);
}
```

### Use in a workflow

```typescript
import { workflow } from "@novu/framework";
import { z } from "zod";
import { renderWelcome } from "./emails/welcome";

export const welcomeWorkflow = workflow(
  "welcome",
  async ({ step, payload }) => {
    await step.email("send-email", async (controls) => ({
      subject: controls.subject,
      body: renderWelcome(payload.userName),
    }), {
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
  }
);
```

### Local preview

React Email ships its own preview dev server:

```bash
npx react-email dev
```

This is **independent** of the Novu Studio — useful for designing your templates before wiring them into a workflow.

### Pass controls into the template

You can derive template props from controls:

```tsx
export const NewSignUp = ({
  hideBanner,
  components,
}: {
  hideBanner: boolean;
  components: { type: string; content: string }[];
}) => (
  <Html>
    <Body>
      {!hideBanner && <Banner />}
      {components.map((c, i) => <Section key={i}>{c.content}</Section>)}
    </Body>
  </Html>
);
```

```typescript
await step.email("send-email", async (controls) => ({
  subject: controls.subject,
  body: render(
    <NewSignUp hideBanner={controls.hideBanner} components={controls.components} />
  ),
}), {
  controlSchema: z.object({
    hideBanner: z.boolean().default(false),
    subject: z.string().default("Welcome"),
    components: z.array(
      z.object({
        type: z.enum(["header", "cta-row", "footer"]),
        content: z.string(),
      })
    ),
  }),
});
```

## Remix + React Email

```bash
npm install @react-email/components react-email
```

Place templates in `app/emails/`:

```tsx
// app/emails/sample-email.tsx
import { Button, Html, render } from "@react-email/components";

function Email(props: { name: string }) {
  return (
    <Html>
      <Button
        href="https://example.com"
        style={{ background: "#000", color: "#fff", padding: "12px 20px" }}
      >
        Click me
      </Button>
    </Html>
  );
}

export function renderEmail(props: { name: string }) {
  return render(<Email {...props} />);
}
```

```typescript
import { renderEmail } from "../emails/sample-email";
import { workflow } from "@novu/framework";

workflow("welcome", async ({ step }) => {
  await step.email("send-email", async (inputs) => ({
    subject: "Welcome to Remix and React Email",
    body: renderEmail(inputs as { name: string }),
  }));
});
```

A complete example app: [novuhq/novu-framework-remix-example](https://github.com/novuhq/novu-framework-remix-example).

## Vue Email (Nuxt)

### Install

```bash
npm install @vue-email/components
```

### Configure Nuxt

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  build: { transpile: ["@vue/email"] },
  nitro: {
    esbuild: { options: { target: "esnext" } },
  },
});
```

### Define a template

```vue
<!-- emails/welcome.vue -->
<script setup lang="ts">
import { VueEmail, Button, Container, Head, Html, Preview } from "@vue-email/components";

defineProps<{ name: string }>();
</script>

<template>
  <VueEmail>
    <Html>
      <Head />
      <Preview>Welcome to Vue Email</Preview>
      <Container>
        <h1>Welcome, {{ name }}!</h1>
        <p>Thanks for trying Vue Email.</p>
      </Container>
    </Html>
  </VueEmail>
</template>
```

### Use in a workflow

```typescript
import { workflow } from "@novu/framework";
import { renderEmail } from "./emails/welcome";
import { z } from "zod";

export const welcomeWorkflow = workflow("welcome", async ({ step, payload }) => {
  await step.email("send-email", async (controls) => ({
    subject: controls.subject,
    body: renderEmail(payload.userName),
  }), {
    controlSchema: z.object({
      subject: z.string().default("Welcome from {{payload.userName}}"),
    }),
  });
}, {
  payloadSchema: z.object({ userName: z.string().default("John Doe") }),
});
```

A complete example app: [novuhq/novu-framework-nuxt-example](https://github.com/novuhq/novu-framework-nuxt-example).

## Svelte Email

### Install

```bash
npm install svelte-email
```

### Define a template

```svelte
<!-- src/emails/welcome.svelte -->
<script lang="ts">
  import { Body, Container, Head, Html, Preview } from "svelte-email";

  export let name: string;
</script>

<Html>
  <Head />
  <Preview>Welcome to Svelte Email</Preview>
  <Body>
    <Container>
      <h1>Welcome, {name}!</h1>
      <p>Thanks for trying Svelte Email.</p>
    </Container>
  </Body>
</Html>
```

```typescript
// src/emails/welcome.ts
import { render } from "svelte-email";
import Welcome from "./welcome.svelte";

export function renderEmail(name: string) {
  return render({ template: Welcome, props: { name } });
}
```

### Use in a workflow

```typescript
import { workflow } from "@novu/framework";
import { renderEmail } from "./emails/welcome";
import { z } from "zod";

export const welcomeWorkflow = workflow("welcome", async ({ step, payload }) => {
  await step.email("send-email", async (controls) => ({
    subject: controls.subject,
    body: renderEmail(payload.userName),
  }), {
    controlSchema: z.object({
      subject: z.string().default("Welcome to Acme"),
    }),
  });
}, {
  payloadSchema: z.object({ userName: z.string().default("John Doe") }),
});
```

A complete example app: [novuhq/novu-svelte-email](https://github.com/novuhq/novu-svelte-email).

## Tips

- **Co-locate templates with workflows.** Keep `src/novu/workflows/welcome/template.tsx` next to `src/novu/workflows/welcome/index.ts`.
- **Render synchronously when possible.** `render(<Component />)` is sync for React Email (returns a string). Avoid awaiting `render` unless your library requires it.
- **Keep template props small and serializable.** Templates are pure components — pass strings/numbers/arrays, not class instances.
- **Don't fetch data in the template.** Fetch in `step.custom` or inside the `step.email` resolver, then pass plain props.
- **Test in the Studio.** Trigger the workflow with a sample payload — the rendered HTML appears in the Studio preview pane.
- **Use the framework-specific dev server** (`npx react-email dev`, etc.) for fast iteration on the design without round-tripping through the Studio.
