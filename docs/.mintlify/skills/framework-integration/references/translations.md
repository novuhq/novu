# Translations (i18n)

`@novu/framework` workflows are code-first — content is rendered inside your bridge during workflow execution. That means **i18n lives in your application layer**: define translation keys in code (e.g. with [i18next](https://www.i18next.com/)) and resolve them inside step resolvers using `subscriber.locale`.

> The Novu **Translation** system on the Dashboard is intended for **Dashboard-defined** workflows. Framework workflows use your own i18n stack instead.

## Setup with i18next

### Install

```bash
npm install i18next
```

### Define translations

```typescript
// src/novu/translations.ts
import { createInstance, InitOptions } from "i18next";

const i18nOptions: InitOptions = {
  resources: {
    en_US: {
      translation: {
        welcomeEmailSubject: "Welcome to Twitch, {{username}}!",
        welcomeEmailIntroduction:
          "We're glad you could join us. Twitch has a huge, passionate community ready to watch and celebrate all the things you're into, and we've saved a seat just for you.",
        linkText: "WATCH NOW",
        welcomeEmailConclusion:
          "If you want to watch it, someone on Twitch streams it: games, anime, fitness, cosplay, esports, cooking, music, meditation. Take a look around, find a few channels to call home, and cozy up in chat.",
      },
    },
    de_DE: {
      translation: {
        welcomeEmailSubject: "Willkommen bei Twitch, {{username}}!",
        welcomeEmailIntroduction:
          "Wir freuen uns, dass Sie sich uns anschließen konnten. Twitch hat eine riesige, leidenschaftliche Community, die bereit ist, alles zu sehen und zu feiern, was Sie interessiert.",
        linkText: "JETZT ANSEHEN",
        welcomeEmailConclusion:
          "Wenn Sie es ansehen möchten, streamt es jemand auf Twitch.",
      },
    },
  },
};

const i18n = createInstance(i18nOptions);
i18n.init(i18nOptions);

export default i18n;
```

## Use in a workflow

```typescript
import { workflow } from "@novu/framework";
import { z } from "zod";
import i18n from "./translations";
import { renderEmail } from "./emails/welcome";

export const localizedWorkflow = workflow(
  "welcome-localized",
  async ({ step, subscriber }) => {
    await step.email("email-step", async (controls) => {
      const t = i18n.getFixedT([
        subscriber?.locale || (controls.defaultLocale as string),
      ]);

      const subject = t("welcomeEmailSubject", {
        username: subscriber?.firstName || "Novu",
      });

      return {
        subject,
        body: await renderEmail(
          subject,
          t("welcomeEmailIntroduction"),
          t("linkText"),
          t("welcomeEmailConclusion")
        ),
      };
    }, {
      controlSchema: z.object({
        defaultLocale: z.string().default("en_US").optional(),
      }),
    });
  }
);
```

### How `subscriber.locale` is set

`locale` comes from the subscriber record:

```typescript
await novu.subscribers.create({
  subscriberId: "user-123",
  email: "jane@acme.com",
  locale: "de_DE", // ISO BCP 47 with underscore convention
});
```

You can also pass it inline at trigger time:

```typescript
await novu.trigger({
  workflowId: "welcome-localized",
  to: { subscriberId: "user-123", locale: "de_DE" },
  payload: {},
});
```

If `locale` is missing, the resolver falls back to the `defaultLocale` control.

## Email Template Example

```tsx
// src/novu/emails/welcome.tsx
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Img,
  Row,
  Column,
  render,
} from "@react-email/components";
import * as React from "react";

const baseUrl = process.env.IMAGE_BASE_URL;

export const TwitchWelcomeEmail = ({
  subject,
  body,
  linkText,
  body2,
}: {
  subject: string;
  body: string;
  linkText: string;
  body2: string;
}) => (
  <Html>
    <Head />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logo}>
          <Img width={114} src={`${baseUrl}/twitch-logo.png`} />
        </Section>
        <Section style={content}>
          <Text style={paragraph}>{body}</Text>
          <Section style={center}>
            <Link href="https://www.twitch.tv" style={link}>
              {linkText}
            </Link>
          </Section>
          <Text style={paragraph}>{body2}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: "#efeef1", fontFamily: "Helvetica, Arial, sans-serif" };
const paragraph = { lineHeight: 1.5, fontSize: 14 };
const container = { maxWidth: 580, margin: "30px auto", backgroundColor: "#ffffff" };
const content = { padding: "5px 20px 10px 20px" };
const logo = { display: "flex", justifyContent: "center", padding: 30 };
const center = { display: "flex", justifyContent: "center" };
const link: React.CSSProperties = {
  background: "#9147ff",
  color: "#fff",
  borderRadius: 3,
  display: "inline-block",
  fontSize: 18,
  padding: "10px 30px",
  textDecoration: "none",
};

export async function renderEmail(
  subject: string,
  body: string,
  linkText: string,
  body2: string
) {
  return render(
    <TwitchWelcomeEmail
      subject={subject}
      body={body}
      linkText={linkText}
      body2={body2}
    />
  );
}
```

## Mount in your bridge

```typescript
// app/api/novu/route.ts
import { serve } from "@novu/framework/next";
import { localizedWorkflow } from "@/novu/workflows/welcome-localized";

export const { GET, POST, OPTIONS } = serve({
  workflows: [localizedWorkflow],
});
```

## Testing

1. Sync the workflow: `npx novu@latest sync --bridge-url ... --secret-key ...`
2. Create or update subscribers with different locales:
   ```typescript
   await novu.subscribers.patch({ locale: "de_DE" }, "user-123");
   ```
3. Trigger:
   ```typescript
   await novu.trigger({
     workflowId: "welcome-localized",
     to: "user-123",
     payload: {},
   });
   ```

The user should receive their email in `de_DE`.

## Tips

- Use **ISO 639-1 + ISO 3166-1** with underscore convention (`en_US`, `de_DE`, `pt_BR`).
- **Hard-fail on missing keys in development** by setting i18next's `saveMissing` and `missingKeyHandler` — this catches gaps in translations before deploy.
- For **digest emails**, build a localized React component that takes a translation function as a prop and walks events.
- Keep translation files **separate from workflow code** so your translation team can edit JSON without touching TypeScript.
- Use **i18next-http-backend** + your CMS if translations should be edited by non-engineers without a code deploy.

## Alternatives

i18next is just one option — any i18n library works:

- [`react-i18next`](https://react.i18next.com/) (React Email components support hooks via i18next provider patterns)
- [`next-intl`](https://next-intl-docs.vercel.app/) (server-side resolution works fine inside the bridge)
- [`@formatjs/intl`](https://formatjs.io/) for ICU MessageFormat support
- A simple `Record<Locale, Record<Key, string>>` lookup if you only need a few strings
