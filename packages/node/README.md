<div align="center">
  <a href="https://novu.co" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2233092/213641039-220ac15f-f367-4d13-9eaf-56e79433b8c1.png">
    <img src="https://user-images.githubusercontent.com/2233092/213641043-3bbb3f21-3c53-4e67-afe5-755aeb222159.png" width="280" alt="Logo"/>
  </picture>
  </a>
</div>

<h1 align="center">The open-source notification infrastructure for developers</h1>

<div align="center">
The ultimate service for managing multi-channel notifications with a single API.
</div>

  <p align="center">
    <br />
    <a href="https://docs.novu.co" rel="dofollow"><strong>Explore the docs »</strong></a>
    <br />

  <br/>
    <a href="https://github.com/novuhq/novu/issues/new?assignees=&labels=type%3A+bug&template=bug_report.yml&title=%F0%9F%90%9B+Bug+Report%3A+">Report Bug</a>
    ·
    <a href="https://github.com/novuhq/novu/issues/new?assignees=&labels=feature&template=feature_request.yml&title=%F0%9F%9A%80+Feature%3A+">Request Feature</a>
    ·
  <a href="https://discord.novu.co">Join Our Discord</a>
    ·
    <a href="https://github.com/orgs/novuhq/projects/10">Roadmap</a>
    ·
    <a href="https://twitter.com/novuhq">X</a>
    ·
    <a href="https://notifications.directory">Notifications Directory</a>.
    <a href="https://novu.co/blog">Read our blog</a>
  </p>

## ⭐️ Why

Building a notification system is hard, at first it seems like just sending an email but in reality, it's just the beginning. In today's world users expect multi-channel communication experience over email, sms, push, chat, and more... An ever-growing list of providers is popping up each day, and notifications are spread around the code. Novu's goal is to simplify notifications and provide developers the tools to create meaningful communication between the system and its users.

## ✨ Features

- 🌈 Single API for all messaging providers (Email, SMS, Push, Chat)
- 💅 Easily manage notifications over multiple channels
- 🚀 Equipped with a templating engine for advanced layouts and designs
- 🛡 Built-in protection for missing variables
- 📦 Easy to set up and integrate
- 🛡 Written in TypeScript with predictable static types.
- 👨‍💻 Community driven

## 📦 Install

```bash
npm install @novu/node
```

```bash
yarn add @novu/node
```

## 🔨 Usage

```ts
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_SECRET_KEY);

await novu.trigger('<REPLACE_WITH_EVENT_NAME_FROM_ADMIN_PANEL>', {
  to: {
    subscriberId: '<USER_IDENTIFIER>',
    email: 'test@email.com',
    firstName: 'John',
    lastName: 'Doe',
  },
  payload: {
    organization: {
      logo: 'https://evilcorp.com/logo.png',
    },
  },
});
```

## Providers

Novu provides a single API to manage providers across multiple channels with a simple-to-use interface.

#### 💌 Email

- [x] [Sendgrid](https://github.com/novuhq/novu/tree/main/providers/sendgrid)
- [x] [Netcore](https://github.com/novuhq/novu/tree/main/providers/netcore)
- [x] [Mailgun](https://github.com/novuhq/novu/tree/main/providers/mailgun)
- [x] [SES](https://github.com/novuhq/novu/tree/main/providers/ses)
- [x] [Postmark](https://github.com/novuhq/novu/tree/main/providers/postmark)
- [x] [Custom SMTP](https://github.com/novuhq/novu/tree/main/providers/nodemailer)
- [x] [Mailjet](https://github.com/novuhq/novu/tree/main/providers/mailjet)
- [x] [Mandrill](https://github.com/novuhq/novu/tree/main/providers/mandrill)
- [x] [SendinBlue](https://github.com/novuhq/novu/tree/main/providers/sendinblue)
- [x] [EmailJS](https://github.com/novuhq/novu/tree/main/providers/emailjs)
- [ ] SparkPost

#### 📞 SMS

- [x] [Twilio](https://github.com/novuhq/novu/tree/main/providers/twilio)
- [x] [Plivo](https://github.com/novuhq/novu/tree/main/providers/plivo)
- [x] [SNS](https://github.com/novuhq/novu/tree/main/providers/sns)
- [x] [Nexmo - Vonage](https://github.com/novuhq/novu/tree/main/providers/nexmo)
- [x] [Sms77](https://github.com/novuhq/novu/tree/main/providers/sms77)
- [x] [Telnyx](https://github.com/novuhq/novu/tree/main/providers/telnyx)
- [x] [Termii](https://github.com/novuhq/novu/tree/main/providers/termii)
- [x] [Gupshup](https://github.com/novuhq/novu/tree/main/providers/gupshup)
- [ ] Bandwidth
- [ ] RingCentral

#### 📱 Push

- [x] [FCM](https://github.com/novuhq/novu/tree/main/providers/fcm)
- [x] [Expo](https://github.com/novuhq/novu/tree/main/providers/expo)
- [ ] [SNS](https://github.com/novuhq/novu/tree/main/providers/sns)
- [ ] Pushwoosh

#### 👇 Chat

- [x] [Slack](https://github.com/novuhq/novu/tree/main/providers/slack)
- [x] [Discord](https://github.com/novuhq/novu/tree/main/providers/discord)
- [ ] MS Teams
- [ ] Mattermost

#### 📱 In-App

- [x] [Novu](https://docs.novu.co/notification-center/introduction?utm_campaign=node-sdk-readme)
- [ ] MagicBell

#### Other (Coming Soon...)

- [ ] PagerDuty

## 🔗 Links

- [Home page](https://novu.co/)

## SDK Methods

- [Subscribers](#subscribers)
- [Events](#events)
- [Workflows](#workflows)
- [Notification Groups](#notification-groups)
- [Topics](#topics)
- [Feeds](#feeds)
- [Tenants](#tenants)
- [Messages](#messages)
- [Changes](#changes)
- [Environments](#environments)
- [Layouts](#layouts)
- [Integrations](#integrations)
- [Organizations](#organizations)
- [Inbound Parse](#inbound-parse)
- [Execution Details](#execution-details)
- [Workflow Overrides](#workflow-overrides)

### Subscribers

- #### List all subscribers

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

const page = 0;
const limit = 20;

await novu.subscribers.list(page, limit);
```

- #### Identify (create) a new subscriber

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.subscribers.identify('subscriberId', {
  firstName: 'Pawan',
  lastName: 'Jain',
  email: 'pawan.jain@domain.com',
  phone: '+1234567890',
  avatar:
    'https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x',
  locale: 'en-US',
  data: {
    isDeveloper: true,
    customKey: 'customValue',
  },
});
```

- #### Bulk create subscribers

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.subscribers.identify([
  {
    subscriberId: "1",
    firstName: "Pawan",
    lastName: "Jain",
    email: "pawan.jain@domain.com",
    phone: "+1234567890",
    avatar: "https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x",
    locale: "en-US",
    data: {
      isDeveloper : true,
      customKey: "customValue"
    };
  },
  {
    subscriberId: "2",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@domain.com",
    phone: "+1234567891",
    avatar: "https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x",
    locale: "en-UK",
    data: {
      isDeveloper : false,
      customKey1: "customValue1"
    };
  }
  // more subscribers ...
])
```

- #### Get a single subscriber

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.subscribers.get('subscriberId');
```

- #### Update a subscriber

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.subscribers.update("subscriberId",{
  firstName: "Pawan",
  lastName: "Jain",
  email: "pawan.jain@domain.com",
  phone: "+1234567890",
  avatar: "https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x",
  locale: "en-US",
  data: {
    isDeveloper : true,
    customKey: "customValue",
    customKey2: "customValue2"
  };
})
```

- #### Update provider credentials

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// update fcm token
await novu.subscribers.setCredentials('subscriberId', 'fcm', {
  deviceTokens: ['token1', 'token2'],
});

// update slack webhookurl
await novu.subscribers.setCredentials('subscriberId', 'slack', {
  webhookUrl: ['webhookUrl'],
});

// update slack weebhook for a subscriberId with selected integration
await novu.subscribers.setCredentials(
  'subscriberId',
  'slack',
  {
    webhookUrl: ['webhookUrl'],
  },
  'slack_identifier'
);
```

- #### Delete provider credentials

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// delete fcm token
await novu.subscribers.deleteCredentials('subscriberId', 'fcm');

// delete slack webhookurl
await novu.subscribers.deleteCredentials('subscriberId', 'slack');
```

- #### Delete a subscriber

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.subscribers.delete('subscriberId');
```

- #### Update online status

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// mark subscriber as offline
await novu.subscribers.updateOnlineStatus('subscriberId', false);
```

- #### Get subscriber preference for all workflows

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.subscribers.getPreference('subscriberId');
```

- #### Get subscriber global preference

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.subscribers.getGlobalPreference('subscriberId');
```

- #### Get subscriber preference by level

```ts
import { Novu, PreferenceLevelEnum } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');
// Get global level preference
await novu.subscribers.getPreferenceByLevel(
  'subscriberId',
  PreferenceLevelEnum.GLOBAL
);

// Get template level preference
await novu.subscribers.getPreferenceByLevel(
  'subscriberId',
  PreferenceLevelEnum.TEMPLATE
);
```

- #### Update subscriber preference for a workflow

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// enable in-app channel
await novu.subscribers.updatePreference('subscriberId', 'workflowId', {
  channel: {
    type: 'in_app',
    enabled: true,
  },
});

// disable email channel
await novu.subscribers.updatePreference('subscriberId', 'workflowId', {
  channel: {
    type: 'email',
    enabled: false,
  },
});
```

- #### Update subscriber preference globally

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// enable in-app channel and disable email channel
await novu.subscribers.updateGlobalPreference('subscriberId', {
  enabled: true,
  preferences: [
    {
      type: 'in_app',
      enabled: true,
    },
    {
      type: 'email',
      enabled: false,
    },
  ],
});
```

- #### Get in-app messages (notifications) feed for a subscriber

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

const params = {
  page: 0,
  limit: 20,
  // copy this value from in-app editor
  feedIdentifier: "feedId",
  seen: true,
  read: false,
  payload: {
    "customkey": "customValue"
  };
}

await novu.subscribers.getNotificationsFeed("subscriberId", params);
```

- #### Get seen/unseen in-app messages (notifications) count

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// get seen count
await novu.subscribers.getUnseenCount('subscriberId', true);

// get unseen count
await novu.subscribers.getUnseenCount('subscriberId', false);
```

- #### Mark an in-app message (notification) as seen/unseen/read/unread

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// mark unseen
await novu.subscribers.markMessageAs('subscriberId', 'messageId', {
  seen: false,
});

// mark seen and unread
await novu.subscribers.markMessageAs('subscriberId', 'messageId', {
  seen: true,
  read: false,
});
```

- #### Mark all in-app messages (notifications) as seen/unseen/read/unread

```ts
import { Novu, MarkMessagesAsEnum } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// mark all messages as seen
await novu.subscribers.markAllMessagesAs(
  'subscriberId',
  MarkMessageAsEnum.SEEN,
  'feedId'
);

// mark all messages as read
await novu.subscribers.markAllMessagesAs(
  'subscriberId',
  MarkMessageAsEnum.READ,
  'feedId'
);
```

- #### Mark in-app message (notification) action as seen

```ts
import { Novu, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// mark a message's primary action button as pending
await novu.subscribers.markMessageActionSeen(
  'subscriberId',
  'messageId',
  ButtonTypeEnum.PRIMARY,
  {
    status: MessageActionStatusEnum.PENDING,
  }
);

// mark a message's secondary action button as done
await novu.subscribers.markMessageActionSeen(
  'subscriberId',
  'messageId',
  ButtonTypeEnum.SECONDARY,
  {
    status: MessageActionStatusEnum.DONE,
  }
);
```

### Events

- #### Trigger workflow to one subscriber

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// trigger to existing subscribers
await novu.events.trigger("workflowIdentifier", {
  to: "subscriberId",
  payload: {
    customKey: "customValue",
    customKey1: {
      nestedkey1: "nestedValue1"
    }
  },
  overrides: {
    email: {
      from: "support@novu.co",
      // customData will work only for sendgrid
      customData: {
        "customKey": "customValue"
      },
      headers: {
        'X-Novu-Custom-Header': 'Novu-Custom-Header-Value',
      },
    }
  },
  // actorId is subscriberId of actor
  actor: "actorId",
  tenant: "tenantIdentifier"
});

// create new subscriber inline with trigger
await novu.events.trigger("workflowIdentifier", {
  to: {
    subscriberId: "1",
    firstName: "Pawan",
    lastName: "Jain",
    email: "pawan.jain@domain.com",
    phone: "+1234567890",
    avatar: "https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x",
    locale: "en-US",
    data: {
      isDeveloper : true,
      customKey: "customValue"
    };
  },
  payload: {},
  overrides:{} ,
  actor: "actorId",
  tenant: "tenantIdentifier"
});
```

- #### Trigger workflow to multiple subscribers

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.events.trigger("workflowIdentifier", {
  to: [ "subscriberId1" , "subscriberId2" ],
  payload: {},
  overrides:{} ,
  actor: "actorId",
  tenant: "tenantIdentifier"
});


// create new subscribers inline with trigger
await novu.events.trigger("workflowIdentifier", {
  to: [
    {
      subscriberId: "1",
      firstName: "Pawan",
      lastName: "Jain",
      email: "pawan.jain@domain.com",
      phone: "+1234567890",
      avatar: "https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x",
      locale: "en-US",
      data: {
        isDeveloper : true,
        customKey: "customValue"
      };
    },
    {
      subscriberId: "2",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@domain.com",
      phone: "+1234567891",
      avatar: "https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x",
      locale: "en-UK",
      data: {
        isDeveloper : false,
        customKey1: "customValue1"
      };
    }
  ],
  payload: {},
  overrides:{} ,
  actor: "actorId",
  tenant: "tenantIdentifier"
});
```

- #### Trigger to a topic

```ts
import { Novu, TriggerRecipientsTypeEnum } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.events.trigger('workflowIdentifier', {
  to: {
    type: TriggerRecipientsTypeEnum.TOPIC,
    topicKey: TopicKey,
  },
});
```

- #### Bulk trigger multiple workflows to multiple subscribers

There is a limit of 100 items in the array of bulkTrigger.

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.events.bulkTrigger([
  {
    name: 'workflowIdentifier_1',
    to: 'subscriberId_1',
    payload: {
      customKey: 'customValue',
      customKey1: {
        nestedkey1: 'nestedValue1',
      },
    },
    overrides: {
      email: {
        from: 'support@novu.co',
      },
    },
    // actorId is subscriberId of actor
    actor: 'actorId',
    tenant: 'tenantIdentifier',
  },
  {
    name: 'workflowIdentifier_2',
    to: 'subscriberId_2',
    payload: {
      customKey: 'customValue',
      customKey1: {
        nestedkey1: 'nestedValue1',
      },
    },
    overrides: {
      email: {
        from: 'support@novu.co',
      },
    },
    // actorId is subscriberId of actor
    actor: 'actorId',
    tenant: 'tenantIdentifier',
  },
]);
```

- #### Broadcast to all subscribers

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.events.broadcast('workflowIdentifier', {
  payload: {
    customKey: 'customValue',
    customKey1: {
      nestedkey1: 'nestedValue1',
    },
  },
  overrides: {
    email: {
      from: 'support@novu.co',
    },
  },
  tenant: 'tenantIdentifier',
});
```

- #### Cancel the triggered workflow

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.events.cancel('transactionId');
```

### Messages

- #### List all messages

```ts
import { Novu, ChannelTypeEnum } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

const params = {
  page: 0, // optional
  limit: 20, // optional
  subscriberId: 'subscriberId', //optional
  channel: ChannelTypeEnum.EMAIL, //optional
  transactionIds: ['txnId1', 'txnId2'], //optional
};

await novu.messages.list(params);
```

- #### Delete a message by `messageId`

```ts
import { Novu, ChannelTypeEnum } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.messages.deleteById('messageId');
```

### Layouts

- #### Create a layout

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

const payload = {
  content: "<h1>Layout Start</h1>{{{body}}}<h1>Layout End</h1>",
  description: "Organization's first layout",
  name: "First Layout",
  identifier: "firstlayout",
  variables: [
    {
      type: "String",
      name: "body",
      required: true,
      defValue: ""
    }
  ]
  isDefault: "false"
}
await novu.layouts.create(payload);
```

- #### Update a layout

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

const payloadToUpdate = {
  content: "<h1>Layout Start</h1>{{{body}}}<h1>Layout End</h1>",
  description: "Organization's first layout",
  name: "First Layout",
  identifier: "firstlayout",
  variables: [
    {
      type: "String",
      name: "body",
      required: true,
      defValue: ""
    }
  ]
  isDefault: false
}
await novu.layouts.update("layoutId", payloadToUpdate);
```

- #### Set a layout as the default layout

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.layouts.setDefault('layoutId');
```

- #### Get a layout by `layoutId`

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.layouts.get('layoutId');
```

- #### Delete a layout by `layoutId`

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.layouts.delete('layoutId');
```

- #### List all layouts

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

const params = {
  page: 0, // optional
  pageSize: 20, // optional
  sortBy: '_id',
  orderBy: -1, //optional
};

await novu.layouts.list(params);
```

### Notification Groups

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// create a new notification group
await novu.notificationGroups.create('Product Updates');

// update an existing notification group
await novu.notificationGroups.update('notificationGroupId', {
  name: 'Changelog Updates',
});

// list all notification groups
await novu.notificationGroups.get();

// get one existing notification group
await novu.notificationGroups.getOne('notificationGroupId');

// delete an existing notification group
await novu.notificationGroups.delete('notificationGroupId');
```

### Topics

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

const payloadToCreate = {
  key: 'first-topic',
  name: 'First Topic',
};

// create new topic
await novu.topics.create(payloadToCreate);

// add subscribers
await novu.topics.addSubscribers('topicKey', {
  subscribers: ['subscriberId1', 'subscriberId2'],
});

// check if subscriber is present in topic
await novu.topics.checkSubscriber('topicKey', 'subscriberId');

// remove subscribers from topic
await novu.topics.removeSubscribers('topicKey', {
  subscribers: ['subscriberId1', 'subscriberId2'],
});

const topicsListParams = {
  page: 0, //optional
  pageSize: 20,
  key: 'topicKey',
};

// list all topics
await novu.topics.list(topicsListParams);

// get a topic
await novu.topics.get('topicKey');

// delete a topic
await novu.topics.delete('topicKey');

// get a topic
await novu.topics.rename('topicKey', 'New Topic Name');
```

### Integrations

```ts
import { Novu, ChannelTypeEnum, ProvidersIdEnum } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

const updatePayload = {
  name: "SendGrid",
  identifier: "sendgrid-identifier",
  credentials: {
    apiKey: "SUPER_SECRET_API_KEY",
    from: "sales@novu.co",
    senderName: "Novu Sales Team"
    // ... other credentials as per provider
  },
  active: true,
  check: false
}

const createPayload: {
  ...updatePayload,
  channel: ChannelTypeEnum.EMAIL,
}

// create a new integration
await novu.integrations.create(ProvidersIdEnum.SendGrid, createPayload)

// update integration
await novu.integrations.update("integrationId", updatePayload)

// get all integrations
await novu.integrations.getAll()

// get only active integrations
await novu.integrations.getActive()

// get webhook provider status
await novu.integrations.getWebhookProviderStatus(ProvidersIdEnum.SendGrid)

// delete existing integration
await novu.integrations.delete("integrationId")

// get novu in-app status
await novu.integrations.getInAppStatus()

// set an integration as primary
await novu.integrations.setIntegrationAsPrimary("integrationId")
```

### Feeds

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// create new in-app feed
await novu.feeds.create('Product Updates');

/**
 * get all in-app feeds
 * feeds methods returns only feed information
 * use subscriber.notificationsFeed() for in-app messages
 */
await novu.feeds.get();

// delete a feed
await novu.feeds.delete('feedId');
```

### Changes

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

const changesParams = {
  page: 1, //optional
  limit: 20, // optional
  promoted: false, // required
};

// get all changes
await novu.changes.get(changesParams);

// get changes count
await novu.changes.getCount();

// apply only one change
await novu.changes.applyOne('changeId');

// apply many changes
await novu.changes.applyMany(['changeId1', 'changeId2']);
```

### Environments

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// get current environment
await novu.environments.getCurrent();

// create new environment
await novu.environments.create({
  name: 'Stagging',
  parentId: 'parentEnvironmentId',
});

// get all environmemts
await novu.environments.getAll();

// update one environment
await novu.environments.updateOne('environmentId', {
  name: 'Stagging', // optional
  parentId: 'parentEnvironmentId', // optional
  identifier: 'environmentIdentifier', // optional
});

// get api keys of environment
await novu.environments.getApiKeys();

// regenrate api keys
await novu.environments.regenerateApiKeys();
```

### Tenants

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// create new tenat
await novu.tenants.create('tenantIdentifier', {
  name: 'First Tenant',
  // optional
  data: {
    country: 'US',
    tokens: ['token1', 'token2'],
    isDeveloperTenant: true,
    numberOfMembers: 2,
    isSales: undefined,
  },
});

// update existing tenant
await novu.tenants.update('tenantIdentifier', {
  identifier: 'tenantIdentifier1',
  name: 'Second Tenant',
  // optional
  data: {
    country: 'India',
    tokens: ['token1', 'token2'],
    isDeveloperTenant: true,
    numberOfMembers: 2,
    isSales: undefined,
  },
});

// list all tenants
await novu.tenants.list({
  page: 0, // optional
  limit: 20, // optional
});

// delete a tenant
await novu.tenants.delete('tenantIdentifier');

// get one tenant
await novu.tenants.get('tenantIdentifier');
```

### Workflows

- #### Create a new workflow

```ts
import {
  Novu,
  TemplateVariableTypeEnum,
  FilterPartTypeEnum,
  StepTypeEnum,
} from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// List all workflow groups
const { data: workflowGroupsData } = await novu.notificationGroups.get();

// Create a new workflow
await novu.notificationTemplates.create({
  name: 'Onboarding Workflow',
  // taking first workflow group id
  notificationGroupId: workflowGroupsData.data[0]._id,
  steps: [
    // Adding one chat step
    {
      active: true,
      shouldStopOnFail: false,
      // UUID is optional.
      uuid: '78ab8c72-46de-49e4-8464-257085960f9e',
      name: 'Chat',
      filters: [
        {
          value: 'AND',
          children: [
            {
              field: '{{chatContent}}',
              value: 'flag',
              operator: 'NOT_IN',
              // 'payload'
              on: FilterPartTypeEnum.PAYLOAD,
            },
          ],
        },
      ],
      template: {
        // 'chat'
        type: StepTypeEnum.CHAT,
        active: true,
        subject: '',
        variables: [
          {
            name: 'chatContent',
            // 'String'
            type: TemplateVariableTypeEnum.STRING,
            required: true,
          },
        ],
        content: '{{chatContent}}',
        contentType: 'editor',
      },
    },
  ],
  description: 'Onboarding workflow to trigger after user sign up',
  active: true,
  draft: false,
  critical: false,
});
```

- #### Other Methods

```ts
import {
  Novu,
  TemplateVariableTypeEnum,
  FilterPartTypeEnum,
  StepTypeEnum,
} from '@novu/node';

// update a workflow

await novu.notificationTemplates.update('workflowId', {
  name: 'Send daily digest email update',
  description: 'This workflow will send daily digest email to user at 9:00 AM',
  /**
   * all other fields from create workflow payload
   */
});

// get one workflow
await novu.notificationTemplates.getOne('workflowId');

// delete one workflow
await novu.notificationTemplates.delete('workflowId');

// update status of one workflow
await novu.notificationTemplates.updateStatus('workflowId', false);

// list all workflows
await novu.notificationTemplates.getAll({
  page: 0, // optional
  limit: 20, // optional
});
```

### Organizations

- #### List all organizations

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.organizations.list();
```

- #### Create new organization

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.organizations.create({ name: 'New Organization' });
```

- #### Rename organization

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.organizations.rename({ name: 'Renamed Organization' });
```

- #### Get current organization details

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.organizations.getCurrent();
```

- #### Remove member from organization

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.organizations.removeMember('memberId');
```

- #### Update organization member role

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.organizations.updateMemberRole('memberId', {
  role: 'admin';
});
```

- #### Get all members of organization

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.organizations.getMembers();
```

- #### Update organization branding details

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.organizations.updateBranding({
  logo: 'https://s3.us-east-1.amazonaws.com/bucket/image.jpeg',
  color: '#000000',
  fontFamily: 'Lato',
});
```

### Inbound Parse

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

// Validate the mx record setup for the inbound parse functionality
await novu.inboundParse.getMxStatus();
```

### Execution Details

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

const executionDetailsParams = {
  subscriberId: 'subscriberId_123',
  notificationId: 'notificationid_abcd',
};

// get execution details
await novu.executionDetails.get(executionDetailsParams);
```

### Workflow Overrides

- #### Create new workflow override

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.workflowOverrides.create({
  workflowId: 'workflow_id_123',
  tenantId: 'tenant_id_abc',
  active: false,
  preferenceSettings: {
    email: false,
    sms: false,
    in_app: false,
    chat: true,
    push: false,
  },
});
```

- #### List all workflow overrides

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.workflowOverrides.list(3, 10);
```

- #### Get workflow override by id

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.workflowOverrides.getOneById('overrideId_123');
```

- #### Get workflow override by tenant and workflow ids

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.workflowOverrides.getOneByTenantIdandWorkflowId(
  'workflowId_123',
  'tenantId_123'
);
```

- #### Update workflow override by tenant and workflow ids

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.workflowOverrides.updateOneByTenantIdandWorkflowId(
  'workflowId_123',
  'tenantId_123',
  {
    active: false,
  }
);
```

- #### Update workflow override by id

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.workflowOverrides.updateOneById('OVERRIDE_ID', {
  active: false,
});
```

- #### Delete workflow override

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_SECRET_KEY>');

await novu.workflowOverrides.delete('overrideId_123');
```
