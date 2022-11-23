---
sidebar_position: 2
---

# Quick Start

To create your free managed, or docker-based Novu environment use our CLI tool:

```shell
npx novu init
```

After creating your cloud or self-hosted account, the next steps to sending your first notification are outlined in this guide.

- Connect your providers
- Create a notification template
- Send a trigger
- Integrate the Notification Center within your app _(optional)_

## Connect providers

On the “**Integration Store**” page, you can configure the different providers and their respective credentials. During the alpha phase only a **single provider** is allowed **per channel,** adding a second email provider will de-activate the previously added email provider.

## Create a notification template

After configuring the designated channel provider, you can create your notification template. You can think of the notification template as the blueprint for the notifications that will be sent. The template includes:

- Notification details
- Channel specific content
- Trigger definition

### Notification Details

The **name** of the notifications is converted to a slug that is used as the trigger identifier which is used when sending the trigger from the back-end.

### Channel specific content

#### Email

You can specify the content for emails in two ways:

**Visual template builder** - For simple use cases, you can use our visual template editor. The visual template builder has limited control over design but is easier to get-started with.

**Custom Code** - You can use the custom code section to specify custom html for the email.

You can specify custom variables using the [{{handlebars}}](https://handlebarsjs.com/guide/) syntax.

#### SMS

Inside SMS, you can specify custom variables using [{{handlebars}}](https://handlebarsjs.com/guide/) syntax.

#### In-app

In the notification center preview, you can type the content of the notification, select the content, and use `CMD` + `B` to make the selected text bold.

#### Chat

You can specify custom variables using the [{{handlebars}}](https://handlebarsjs.com/guide/) syntax.

In addition to the integration, any subscriber needs to set credentials to have proper authorization on the channel.

The credentials can be saved through our @novu/node package.

## Trigger the notification

After creating the template, Novu generates the trigger. Use the server SDK in your application in the appropriate place for the specific trigger.

```typescript
await novu.trigger('<REPLACE_WITH_EVENT_NAME_FROM_ADMIN_PANEL>', {
  to: {
    subscriberId: '<USER_IDENTIFIER>',
    email: 'email@email.com',
    firstName: 'John',
    lastName: 'Doe',
  },
  payload: {
    customVariables: 'Hello',
  },
});
```

The trigger function contains a parameters object as the second parameter. Let's explore its different options:

### `to` key

The `to` parameter contains the information about the subscriber of the notification. You can work with Novu in 2 modes:

#### Pass the subscriber information in the trigger (Quickest)

You can pass the subscriber object containing the following keys as this parameter:

```typescript
await novu.trigger('<REPLACE_WITH_EVENT_NAME_FROM_ADMIN_PANEL>', {
  to: {
    subscriberId: 'Unique Subscriber Identifier',
    firstName,
    lastName,
    email,
    phone,
    avatar,
  },
  payload: {},
});
```

The `subscriberId` is a custom identifier that identifies users within the Novu platform. We suggest using your internal DB identifier for this field.

When the trigger is called, Novu performs an upsert command, which either creates a subscriber with the specified payload, or updates the existing subscriber with the passed information.

**Note:** The API performs a PATCH command, updating only the fields passed to it. So to reset a specific field, you must explicitly pass `null` as the fields param.

#### Pass only the `subscriberId` (Recommended)

```typescript
{
  to: 'SUBSCRIBER_ID',
  payload: {}
}
```

In this approach, you only pass the `subscriberId` as part of the trigger, however, this approach requires you to identify the subscriber using the `identify` method from the `@novu/node` library.

### `payload` object

The `payload` object can pass any serializable JSON object to be used in the notification templates.
