---
sidebar_position: 2
---

# Subscribers

Novu manages your users in a specific subscribers data model, that allows the Novu API to manage different aspects of the notification flow while providing an easy interface for triggering notifications.

A novu subscriber contains the following data points:

- **User data** - Data stored in the subscriber object that you can easily access in your notification templates. This contains basic info such as first name, last name, avatar, etc...
- **Contact information** - Things like e-mail, phone number, push tokens, etc... They will be used when a multi-channel template will be configured. Managing all communication credentials will reduce the amount of data you need to pass when triggering a notification.

## Creating a subscriber

When you want to send a notification to a specific recipient in the Novu platform, you must first create a subscriber using our server SDK.

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.identify(user.id, {
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  avatar: user.profile_avatar,
  locale: user.locale,
  data: { custom1: 'customval1', custom2: 'customval2' },
});
```

Novu will create a subscriber if one does not exist, and will update existing subscribers based on the `identify` payload. You can call this function during registration or signup to make sure the subscriber data is up-to-date, if you wish to save aditional attributes with subscriber, you can pass aditional custom data as **data** property.

### Subscriber identifier

This is a unique identifier used by Novu to keep track of a specific subscriber. We recommend using the internal id your application uses for a specific user.
Using an identifier like email might cause issues locating a specific subscriber once they change their email address.

### Updating subscriber data

In some cases, you want to access subscribers to update a specific field or data attribute. For example, when the user changes their email address or personal details.

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.update(user.id, {
  email: user.email,
});
```

### Updating subscriber credentials

Users who wish to use chat channels will need to set their credentials to be authenticated.

```typescript
import { Novu, ChatProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.setCredentials('subscriberId', ChatProviderIdEnum.Slack, {
  webhookUrl: 'webhookUrl',
});
```

- subscriberId is a custom identifier used when identifying your users within the Novu platform.
- providerId is a unique provider identifier (we recommend using ChatProviderIdEnum).
- credentials are the argument you need to be authenticated with your provider workspace. At this point, we support chat messages through webhook, so a webhookUrl is needed to be provided.

### Removing a subscriber

To remove and stop a subscriber from receiving communication, you call the remove API to delete the subscriber.

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.delete(user.id);
```

## Subscriber Preferences

Novu manages a data model to help your users configure their preferences in an easy way. You can learn more about this in the [Subscriber Preferences](/platform/preferences) section.

## Frequently Asked Questions

<details>
  <summary>How to store custom properties in subscriber</summary>
  <p>Subscribers have fixed schema. Storing custom properties is not supported but here is a work around, you can store that property in your database and send those values in payload option of trigger using variables. Read more about variables <a href="./templates#variable-usage"> here </a>.</p>
</details>

<details>
  <summary>How to get subscriber properties before step execution in workflow</summary>
  <p>Workflow has access to all existing properties of subscriber as well as payload variables. So no extra steps are needed</p>
</details>
