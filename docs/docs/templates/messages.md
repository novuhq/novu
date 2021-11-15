---
sidebar_position: 6
---

# Messages

Messages are part of the notification template configuration. Each message is tied to a specific channel but not to specific provider. You customize the channel experience by adding channel related metadata (like subject in email, and CTA buttons in Direct messaging).

Here's an example of a template with a single message:

```typescript
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
      active: (trigger) => !!trigger.$email,
    },
  ],
});
```

Let's break down the components of the template:

## Channel

A single channel out of the `ChannelTypeEnum` can be specified here. The values available are: `SMS`, `EMAIL`, `IN_APP` (Coming soon), `DIRECT_MESSAGING` (Coming soon), `PUSH` (Coming soon).
Based on the relevant channel a provider will be fetched from the `ProviderStore`.

## Template

The template is the main content area of the notification. In case of other channel specific metadata like subject or buttons, they can be added to the appropriate field. Notifire uses [Handlebars](https://handlebarsjs.com/) to render the template behind the curtain. So you can specify any Handlebars expression in the template.

```handlebars
{{#each tasks}}
  {{title}}
  {{#if done}}
    <span> Done </span>
  {{/if}}
{{/each}}
```

## Active

A switch to indicate whether this message should be sent or not. This can be a simple boolean, function or a promise that returns a boolean.
You can use it to conditionally send a message based on the trigger inputs.
