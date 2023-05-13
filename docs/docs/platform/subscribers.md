---
sidebar_position: 2
---

# Subscribers

`Subscriber` is a user to whom Novu will send notification. Each subscriber in Novu is uniquely identified by `subscriberId`.Novu manages your users in the form of subscribers. Novu stores some user-specific information that helps you send multichannel notifications to your users.

Each subscriber has the following data points:

- **User Data** - Data stored in the subscriber object that you can easily access in your notification templates. This contains basic info such as first name, last name, avatar, locale, email, and phone. This data is fixed and structured
- **Custom Data** - Apart from the above fixed structured user data, any unstructured custom data such as user's address, nationality, height, etc can also be stored in the `data` field using key-value pairs.
- **Channel Specific Credentials** - `deviceTokens` required to send push notifications and `webhookUrl` for chat channel providers can also be stored.
- **Preferences** - Each subscriber has separate preferences per template and along with template-level preferences. Read more about preferences [here](./preferences.md).

`subscriberId` is a unique identifier used by Novu to keep track of a specific subscriber. We recommend using the internal unique id your application uses for a specific user. Using an identifier like email might cause issues locating a specific subscriber once the users change their email address.

## Create a subscriber

We support creating new subscriber using two ways, `Ahead of Trigger` means adding subscribers before triggering notification or `Inline of Trigger` means sending complete subscriber data in `to` field while triggering.

### 1. Ahead of Trigger

Before triggering any notification, first create the subscriber and then trigger the notification to this subscriber. Here `subscriberId` is the required field and other fields are optional.

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

Novu will create a subscriber if one does not exist and will update the existing subscriber based on the `identify` payload. You can call this function during registration or signup to make sure the subscriber data is up-to-date, if you wish to save additional attributes with a subscriber, you can pass additional custom data in the **data** field as key-value pairs.

### 2. Inline of Trigger

A non-exisiting subscriber can be added by sending subscriber data in `to` field of the trigger method. If any subscriber with provided `subscriberId` does not exists, a new subscriber will be created. In this case, subscriber will be created first and then the trigger will be executed synchronously.

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.trigger('<TEMPLATE_IDENTIFIER>', {
  to: {
    subscriberId: '<USER_IDENTIFIER>',
    email: 'test@email.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+9876543210',
  },
  payload: {
    customVariables: 'Test',
    organization: {
      logo: 'https://organisation.com/logo.png',
    },
  },
});
```

## Find a subscriber

Any subscriber can be retrieved using a unique subscriber identifier `subscriberId`. Check returned subscriber schema [here](#subscriber-response-schema).

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.update('subscriberId');
```

## Update a subscriber

In some cases, you want to access a subscriber to update a specific user data field or custom data field. For example, when the users change their email address or personal details.

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.update(user.id, {
  // new email
  email: user.email,
});
```

## Delete a subscriber

To stop a subscriber from receiving notifications, you can delete the subscriber. This will hard delete the subscriber means you will not be able to access this subscriber later. You will have to create this subscriber again.

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.delete(user.id);
```

## List all subscribers

This method will retrieve all your subscribers in a paginated way. Pagination can be controlled using `page` and `limit` options.

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

// page = 0, limit = 5
await novu.subscribers.list(0, 5);
```

## Updating subscriber credentials

Channel-specific credentials of subscribers can be added or updated using the `setCredentials` method. Novu supports credentials for `push` (deviceTokens) and `chat` (webhookUrl) channels.

```typescript
import { Novu, ChatProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

// Updating slack webhookUrl
await novu.subscribers.setCredentials('subscriberId', 'slack', {
  webhookUrl: 'webhookUrl',
});

// Updating FCM deviceTokens
await novu.subscribers.setCredentials('subscriberId', 'fcm', {
  deviceTokens: ['token1', 'token2'],
});
```

- subscriberId is a unique identifier used when identifying your users within the Novu platform.
- providerId is a unique provider identifier (we recommend using `ChatProviderIdEnum` and `PushProviderIdEnum` for correct values).
- credentials are the values you need to be authenticated with your provider workspace.

## Subscriber Preferences

Novu manages a data model to help your users configure their preferences in an easy way. You can learn more about this in the [Subscriber Preferences](/platform/preferences) section.

## Subscriber response schema

```typescript title="Novu subscriber object"
{
    "_id": "NOVU_GENERATED_SUBSCRIBER_ID",
    "_organizationId": "NOVU_GENERATED_ORG_ID",
    "_environmentId": "NOVU_GENERATED_ENV_ID",
    "firstName": "John",
    "lastName": "Doe",
    "subscriberId": "subscriberId",
    "email": "john.doe@org.com",
    "phone": "+98712345670"
    "data": {
      "custome_key_1" : "custom_value_1"
      "custome_key_2" : "custom_value_2"
    }
    "channels": [
        {
            "credentials": {
                "deviceTokens": [
                    "token1",
                    "token2"
                ]
            },
            "_integrationId": "NOVU_GENERATED_INTEGRATION_ID",
            "providerId": "fcm"
        },
        {
            "credentials": {
                "webhookUrl": "URL"
            },
            "_integrationId": "NOVU_GENERATED_INTEGRATION_ID",
            "providerId": "discord"
        }
    ],
    "deleted": false,
    "createdAt": "2022-10-13T17:40:53.231Z",
    "updatedAt": "2022-10-13T17:41:53.238Z",
    "__v": 0,
    "isOnline": false,
    "lastOnlineAt": "2022-10-13T17:41:53.238Z",
    "avatar": "AVATAR_URL",
    "id": "NOVU_GENERATED_SUBSCRIBER_ID"
}
```

## Important Links

- [Create Subscriber API](https://docs.novu.co/api/create-subscriber/)
- [Get Subscriber API](https://docs.novu.co/api/get-subscriber/)
- [Update Subscriber API](https://docs.novu.co/api/update-subscriber/)
- [Delete Subscriber API](https://docs.novu.co/api/delete-subscriber/)
- [List Subscribers API](https://docs.novu.co/api/get-subscribers/)
- [Update Subscriber Credentials API](https://docs.novu.co/api/update-subscriber-credentials/)

## Frequently Asked Questions

<details>
  <summary>How to store custom properties in subscriber?</summary>
  <p>To store custom properties, use <code>data</code> field of subscriber.</p>
</details>

<details>
  <summary>Why Novu stores user's PII?</summary>
  
  <p>Novu stores user personal information like first name, last name, email, phone, locale, avatar, etc to provide a multichannel notification experience to users. Once these values are stored, Novu automatically configures these values required as per different channels.</p>
</details>

<details>
  <summary> How to create new subscribers in bulk at once?</summary>
  <p>We don't support adding bulk subscribers at once as of now. Workaround for this is to create a custom script to call create single subscriber method or api multiple times to add bulk subscribers.</p>
</details>

<details>
  <summary>How to get subscriber properties before step execution in workflow.</summary>
  <p>Workflow has access to all existing properties of subscriber as well as payload variables. So no extra steps are needed</p>
</details>

<details>
  <summary>How to create list of subscribers?</summary>
  <p>You can use <a href="./topics">topics</a> for this</p>
</details>
