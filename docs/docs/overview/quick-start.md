---
sidebar_position: 2
---

# Quick Start

Let's create a notification layer in **under 5 minutes.**

## 📦 Install

```bash
npm install @novu/stateless
```

```bash
yarn add @novu/stateless
```

## 🔨 Usage

### Register Providers

Choose the providers you need, and register them to with Novu,
full list of providers is available at [full_providers_list], full documentation for providers, and interfaces is available at [].

```ts
import { NovuStateless, ChannelTypeEnum } from "@novu/stateless";
import { SendgridEmailProvider } from "@novu/sendgrid";

const novu = new NovuStateless();

await novu.registerProvider(
  new SendgridEmailProvider({
    apiKey: process.env.SENDGRID_API_KEY,
  })
);
```

### Register Templates

Choose a template created by Novu's community, or create your own, and register with Novu.

```ts
const passwordResetTemplate = await novu.registerTemplate({
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
await novu.trigger("<REPLACE_WITH_EVENT_NAME>", {
  $user_id: "<USER IDENTIFIER>",
  $email: "test@email.com",
  firstName: "John",
  lastName: "Doe",
  organization: {
    logo: "https://evilcorp.com/logo.png",
  },
});
```
