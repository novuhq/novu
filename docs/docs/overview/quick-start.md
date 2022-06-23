---
sidebar_position: 2
---
# Quick Start

To create your free managed or docker based Novu environment use our CLI tool:

```shell
npx novu init
```

After creating your cloud or self-hosted account the next steps to sending your first notification are outlined in this guide.

- Connect your providers
- Create a notification template
- Send a trigger
- Integrate the Notification Center within your app *(optional)*

## Connect providers

In the “**Integration Store**” page you can configure the different providers and their respective credentials. During the alpha phase only a **single provider** is allowed **per-channel,** adding a second email provider will de-activate the previously added provider.

## Create a notification template

After creating the designated channel provider you can create your notification template. You can think of the notification template as the blueprint for the notifications that will be sent. The template includes:

- Notification details
- Channel specific content
- Trigger definition

### Notification Details

This section will contain the metadata for your notification, things such as name, description and group.

The **name** of the notifications will be converted to a slug and will be used as the trigger identifier used when sending the trigger from back-end.

### Channel specific content

#### Email

You can specify the content for email in two ways:

**Visual template builder** - For simple usecases you can use our visual template editor with limited control over design but easier to get-started.

**Custom Code** - You can use the custom code section to specify custom html that will be used for the email.

You can specify custom variables using the [{{handlebars}}](https://handlebarsjs.com/guide/) syntax.

#### SMS

Similiar to the the email, custom variables using hbs syntax can be described to create the final message.

#### In-app

In the notification center preview you can type the content, you can select content an use `CMD` + `B` to make the selected text bold.

## Trigger the notification

After creating the template trigger will be generated, use the server SDK in your application in the appropriate place for the specific trigger.

```typescript
await novu.trigger('<REPLACE_WITH_EVENT_NAME_FROM_ADMIN_PANEL>',
  {
    to: {
      subscriberId: '<USER_IDENTIFIER>',
      email: 'email@email.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    payload: {
      customVariables: 'Hello'
    },
  }
);
```

The trigger function contains a parameters object as the second parameter. Let's explore it's different options:

### `to` key

The `to` parameter contains the information about the subscriber of the notification, you can work with Novu in 2 modes:

#### Pass the subscriber information in trigger (Quickest)

You can pass the subscriber object containing the following keys as this paramter:

```typescript
await novu.trigger('<REPLACE_WITH_EVENT_NAME_FROM_ADMIN_PANEL>',
  {
    to: {
      subscriberId: 'Unique Subscriber Identifier',
      firstName,
      lastName,
      email,
      phone,
      avatar
    },
    payload: {}
  }
);

```

The `subscriberId` is a custom identifier used when identifying your users within the Novu platform. We suggest using your internal DB identifier for this field.

Novu will create an upsert command and either create a subscriber with specified payload, or update the existing subscriber with passed information.

**Note:** The api will perform a PATCH command, updating only the fields passed to it. So in order to reset a specific field you must explicitly pass `null` as the fields param.

#### Pass only the subscriberId (Recommended)

```typescript
{
  to: 'SUBSCRIBER_ID',
  payload: {}
}
```

In this approach, you will only pass the subscriberId as part of the trigger, however it will require you to identify the subscriber using the `identify` method from the `@novu/node` library.

### `payload` object

Can pass any serializible JSON object to be used in the notification templates.
