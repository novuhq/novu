---
sidebar_position: 2
---

# Quick Start

Let's create a notification layer in **under 5 minutes.**

## 📦 Install

```bash
npm install @notifire/core
```

```bash
yarn add @notifire/core
```

## 🔨 Usage

### Register Providers

Choose the providers you need, and register them to with Notifire,
full list of providers is available at [full_providers_list], full documentation for providers, and interfaces is available at [].

```ts
import { Notifire, ChannelTypeEnum } from "@notifire/core";
import { SendgridEmailProvider } from "@notifire/sendgrid";

const notifire = new Notifire();

await notifire.registerProvider(
  new SendgridEmailProvider({
    apiKey: process.env.SENDGRID_API_KEY,
  })
);
```

### Register Templates

Choose a template created by Notifire's community, or create your own, and register with Notifire.

```ts
const passwordResetTemplate = await notifire.registerTemplate({
  id: "password-reset",
  messages: [
    {
      subject: "Your password reset request",
      channel: ChannelTypeEnum.EMAIL,
      template: `
          Hi {{firstName}}!
          
          To reset your password click <a href="{{resetLink}}">here.</a>
          
          {{#if organization}}
            <img src="{{organization.logo}}" />
          {{/if}}
      `,
    },
  ],
});
```

### Trigger

On the relevant business logic unit, just declare the trigger event, pass pre-defined parameters, you're done 🎊.

```ts
await notifire.trigger("<REPLACE_WITH_EVENT_NAME>", {
  $user_id: "<USER IDENTIFIER>",
  $email: "test@email.com",
  firstName: "John",
  lastName: "Doe",
  organization: {
    logo: "https://evilcorp.com/logo.png",
  },
});
```
