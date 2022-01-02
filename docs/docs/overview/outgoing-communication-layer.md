---
sidebar_position: 3
---

# Outgoing Communication Layer (OCL)

OCL was built all around the idea of separation of concerns (SoC). The idea is that transactional communication is composed of many different parts, each of which is responsible for a specific task. Modeling the communication layer is key for easy maintenance and integration of new functionality.

Let's deep dive into the building blocks of Notifire's OCL approach.

## The mental model

![Docusaurus](/img/diagram.jpeg)

## Templates

Templates are the blueprints for all notifications in Notifire. They provide the base configurations for each message. A message is tied to a specific channel, for which a content template is provided, code rules and filters, priorities, and other metadata that will affect the delivery of a specific message.

Here's an example of a template:

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
    },
    {
      channel: ChannelTypeEnum.SMS,
      template: ` 
            Here is the link to reset your password reset: {{resetLink}}
        `,
      active: (trigger) => !trigger.$email,
    },
  ],
});
```

## Providers

Providers are the delivery endpoints for your notifications. They are responsible for delivering the notifications to the end users on the specified channel. Providers usually refer to a specific channel, such as email, SMS, Direct, etc... Each provider is stateless and adheres to a specific interface, Notifire will manage state and mediate all provider-specific configurations.

### Provider Types

- **Email** (Sendgrid, mailgun, mandrill, etc...)
- **SMS** (Twilio, Nexmo, etc...)
- **Direct** (Slack, MS messages, etc...)
- **Push** (Pushover, One Signal, etc...)
- **Web push**

The responsibility of each provider is to send the notification to the end-recipient without the awareness of the content, contact, or the context of the message.

## Trigger

The trigger is responsible to let the engine know what happened and what notification template will be triggered in response to the event. Each trigger will pass the variables and data required to render the notification messages. If a value is missing the variable protection mode will be enabled and the message won't be sent.

The trigger should only be responsible to let the system know that something happened, but not entirely where and when the message will be delivered.

## Communication Engine

This is the unit that is responsible for reading the configurations of the templates, finding the relevant channels, locating the providers, and doing the heavy lifting of sending the notifications. All logical rules such as priority, timing, channel selection, and others are managed by the engine.

## Template and Provider Stores

Responsible for storing the configurations of all the providers and templates during runtime. Currently, they are loaded at bootup and stored in-memory. In the future, they will be persisted in a database.

Each store exposes an interface to query the different providers or templates to be used by the engine later.
