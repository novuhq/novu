---
sidebar_position: 2
---

import FAQ from '@site/src/components/FAQ';
import FAQItem from '@site/src/components/FAQItem';

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Subscribers

`Subscriber` is a user to whom Novu will send a notification. Each subscriber in Novu is uniquely identified by `subscriberId`. Novu manages your users in the form of subscribers. Novu stores some user-specific information that helps you send multichannel notifications to your users.

Each subscriber has the following data points:

- **User Data** - Data stored in the subscriber object that you can easily access in your notification templates. This contains basic info such as first name, last name, avatar, locale, email, and phone. This data is fixed and structured.
- **Custom Data** - Apart from the above fixed structured user data, any unstructured custom data such as user's address, nationality, height, etc can also be stored in the `data` field using key-value pairs.
- **Channel Specific Credentials** - `deviceTokens` required to send push notifications and `webhookUrl` for chat channel providers can also be stored.
- **Preferences** - Each subscriber has separate preferences per template and along with template-level preferences. Read more about preferences [here](./preferences.md).

`subscriberId` is a unique identifier used by Novu to keep track of a specific subscriber. We recommend using the internal unique id your application uses for a specific user.

:::info
Using an identifier like `email` might cause issues locating a specific subscriber once the users change their email address so it is discouraged.
:::

## Create a subscriber

We support creating new subscriber using two ways, `Ahead of Trigger` means adding subscribers before triggering notification or `Inline of Trigger` means sending complete subscriber data in `to` field while triggering.

### 1. Ahead of Trigger

Before triggering any notification, first create the subscriber and then trigger the notification to this subscriber. Here `subscriberId` is the required field and other fields are optional.

<Tabs groupId="language" queryString>
  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.subscribers.identify('111', {
  email: 'john.doe@domain.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+13603963366',
  avatar: 'https://example.com/images/avatar.jpg',
  locale: 'en',
  data: { customKey1: 'customVal1', customKey2: 'customVal2' },
});
```

  </TabItem>
    <TabItem value="php" label="PHP">

```php
use Novu\SDK\Novu;

$novu = new Novu('<NOVU_API_KEY>');

$novu->createSubscriber([
    'subscriberId' => '111',
    'email' => 'john.doe@domain.com',
    'firstName' => 'John',
    'lastName' => 'Doe',
    'phone' => '+13603963366',
    'avatar' => 'https://example.com/images/avatar.jpg',
    'locale' => 'en',
    'data' => [
      'customKey1' => 'customVal1',
      'customKey2' => 'customVal2'
    ]
]);
```

  </TabItem>
</Tabs>
Novu will create a subscriber if one does not exist and will update the existing subscriber based on the `identify` payload. You can call this function during registration or signup to make sure the subscriber data is up-to-date, if you wish to save additional attributes with a subscriber, you can pass additional custom data in the **data** field as key-value pairs.

### 2. Inline of Trigger

A non-existing subscriber can be added by sending subscriber data in `to` field of the trigger method. If any subscriber with provided `subscriberId` does not exists, a new subscriber will be created. In this case, subscriber will be created first and then the trigger will be executed synchronously.

<Tabs groupId="language" queryString>
  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.trigger('<TEMPLATE_IDENTIFIER>', {
  to: {
    subscriberId: '111',
    email: 'john.doe@domain.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+13603963366',
  },
  payload: {
    customVariable: 'variableValue',
    organization: {
      logo: 'https://organisation.com/logo.png',
    },
  },
});
```

  </TabItem>
  <TabItem value="php" label="PHP">

```php
use Novu\SDK\Novu;

$novu = new Novu('<NOVU_API_KEY>');

$novu->triggerEvent([
    'name' => '<TEMPLATE_IDENTIFIER>',
    'to' => [
        'subscriberId' => '111',
        'email' => 'john.doe@domain.com',
        'firstName' => 'John',
        'lastName'  => 'Doe',
        'phone' => '+13603963366'
    ]
    'payload' => [
       'customVariable' => 'variableValue',
       'organization' => [
         'logo' => 'https://organisation.com/logo.png',
       ]
     ],
]);
```

  </TabItem>
</Tabs>

## Subscriber attributes

| Field        | Type     | Required | Example                                 |
| ------------ | -------- | -------- | --------------------------------------- |
| subscriberId | `string` | true     | b0bea066-f5fe-11ed-b67e-0242ac120002    |
| firstName    | `string` | false    | John                                    |
| lastName     | `string` | false    | Doe                                     |
| email        | `string` | false    | john.doe@domain.org                     |
| phone        | `string` | false    | +13603963366                            |
| locale       | `string` | false    | en                                      |
| avatar       | `string` | false    | <https://example.com/images/avatar.jpg> |
| data         | `object` | false    | {"key" : "value"}                       |

## Find a subscriber

Any subscriber can be retrieved using a unique subscriber identifier `subscriberId`. Check the returned subscriber schema [here](#subscriber-response-schema).

<Tabs groupId="language" queryString>
  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.subscribers.get('111');
```

  </TabItem>
  <TabItem value="php" label="PHP">

```php
use Novu\SDK\Novu;

$novu = new Novu('<NOVU_API_KEY>');

$novu->getSubscriber('111')->toArray();
```

  </TabItem>
</Tabs>

## Update a subscriber

In some cases, you want to access a subscriber to update a specific user data field or custom data field. For example, when the users change their email address or personal details.

<Tabs groupId="language" queryString>
  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.subscribers.update('111', {
  // new email
  email: 'john@domain.com',
  // new phone
  phone: '+19874567832',
});
```

  </TabItem>
  <TabItem value="php" label="PHP">

```php
use Novu\SDK\Novu;

$novu = new Novu('<NOVU_API_KEY>');

$novu->updateSubscriber('111', [
    // new email
    'email' => 'john@domain.com',
    // new phone
    'phone' => '+19874567832',
])->toArray();
```

  </TabItem>
</Tabs>

## Delete a subscriber

To stop a subscriber from receiving notifications, you can delete the subscriber. This will hard delete the subscriber and means you will not be able to access this subscriber later. You will have to create this subscriber again.

<Tabs groupId="language" queryString>
  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.subscribers.delete('111');
```

  </TabItem>
    <TabItem value="php" label="PHP">

```php
use Novu\SDK\Novu;

$novu = new Novu('<NOVU_API_KEY>');

$novu->deleteSubscriber('111');
```

  </TabItem>
</Tabs>

## List all subscribers

This method will retrieve all your subscribers in a paginated way. Pagination can be controlled using `page` and `limit` options.

<Tabs groupId="language" queryString>
  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

const page = 0;

await novu.subscribers.list(page);
```

  </TabItem>
  <TabItem value="php" label="PHP">

```php
use Novu\SDK\Novu;

$novu = new Novu('<NOVU_API_KEY>');

$page = 0;

$novu->getSubscriberList($page)->toArray();
```

  </TabItem>
</Tabs>

## Updating subscriber credentials

Channel-specific credentials of subscribers can be added or updated using the `setCredentials` method. Novu supports credentials for `push` (deviceTokens) and `chat` (webhookUrl) channels.

<Tabs groupId="language" queryString>
  <TabItem value="js" label="Node.js">

```javascript
import { Novu, ChatProviderIdEnum } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

// Update slack webhookUrl
await novu.subscribers.setCredentials('111', 'slack', {
  webhookUrl: 'webhookUrl',
});

// Update FCM deviceTokens
await novu.subscribers.setCredentials('111', 'fcm', {
  deviceTokens: ['token1', 'token2'],
});
```

  </TabItem>
  <TabItem value="php" label="PHP">

```php
use Novu\SDK\Novu;

$novu = new Novu('<NOVU_API_KEY>');

// Update Slack webhookUrl
$novu->updateSubscriberCredentials('111', [
    'providerId'  => 'slack',
    'credentials' => [
       'webhookUrl' => 'webhookUrl',
     ]
]);

// Update FCM deviceTokens
$novu->updateSubscriberCredentials('111', [
    'providerId'  => 'fcm',
    'credentials' => [
       'deviceTokens' => ['token1', 'token2']
]);
```

  </TabItem>
</Tabs>

- `subscriberId` is a unique identifier used when identifying your users within the Novu platform.
- `providerId` is a unique provider identifier (we recommend using `ChatProviderIdEnum` and `PushProviderIdEnum` for correct values).
- `credentials` are the values you need to be authenticated with your provider workspace.

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

<FAQ>
<FAQItem title="How to store custom properties in subscriber?">

To store custom properties, use <code>data</code> field of subscriber.

</FAQItem>
<FAQItem title="Why Novu stores user's PII?">

Novu stores user personal information like first name, last name, email, phone, locale, avatar, etc to provide a multichannel notification experience to users. Once these values are stored, Novu automatically configures these values required as per different channels.

</FAQItem>
<FAQItem title="How to create new subscribers in bulk at once?">

We don't support adding bulk subscribers at once as of now. Workaround for this is to use [this csv based script](../guides/subscribers-migration.md#bulk-subscribers-migration-using-mock-data-csv-file).

</FAQItem>
<FAQItem title="How to get subscriber properties before step execution in workflow.">

Workflow has access to all existing properties of subscriber as well as payload variables. So no extra steps are needed.

</FAQItem>
<FAQItem title="How to create list of subscribers?">

You can use [topics](./topics) to create list of subscribers.

</FAQItem>
</FAQ>
