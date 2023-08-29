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
    <a href="https://twitter.com/novuhq">Twitter</a>
    ·
    <a href="https://notifications.directory">Notifications Directory</a>
    .
    <a href="https://novu.co/blog">Read our blog</a>
  </p>
## ⭐️ Why
Building a notification system is hard, at first it seems like just sending an email but in reality it's just the beginning. In today's world users expect multichannel communication experience over email, sms, push, chat and more... An ever-growing list of providers are popping up each day, and notifications are spread around the code. Novu's goal is to simplify notifications and provide developers the tools to create meaningful communication between the system and its users.

## ✨ Features

- 🌈 Single API for all messaging providers (Email, SMS, Push, Chat)
- 💅 Easily manage notification over multiple channels
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

const novu = new Novu(process.env.NOVU_API_KEY);

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

- [x] [Novu](https://docs.novu.co/notification-center/getting-started)
- [ ] MagicBell

#### Other (Coming Soon...)

- [ ] PagerDuty

## 🔗 Links

- [Home page](https://novu.co/)


## SDK Methods

- [Subscribers](#subscribers)
- [Events](#events)
- Workflows
- Notification Groups
- Topics
- Feeds
- Tenants
- Messages
- Changes
- Environments
- Layouts
- Integrations


### Subscribers
- #### list all subscribers

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

const page = 0;
const limit = 20;

await novu.subscribers.list(page,limit)
```

- #### identify (create) a new subscriber
```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.subscribers.identify("subscriberId",{
  firstName: "Pawan";
  lastName: "Jain";
  email: "pawan.jain@domain.com";
  phone: "+1234567890";
  avatar: "https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x";
  locale: "en-US";
  data: {
    isDeveloper : true
    customKey: "customValue"
  };
})
```


- #### bulk create subscribers
```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.subscribers.identify([
  {
    subscriberId: "1"
    firstName: "Pawan";
    lastName: "Jain";
    email: "pawan.jain@domain.com";
    phone: "+1234567890";
    avatar: "https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x";
    locale: "en-US";
    data: {
      isDeveloper : true
      customKey: "customValue"
    };
  },
  {
    subscriberId: "2"
    firstName: "John";
    lastName: "Doe";
    email: "john.doe@domain.com";
    phone: "+1234567891";
    avatar: "https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x";
    locale: "en-US";
    data: {
      isDeveloper : false
      customKey1: "customValue1"
    };
  }
  // more subscribers ...
])
```


- #### get a single subsciber

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.subscribers.get("subscriberId")
```

- #### update a subscriber

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.subscribers.update("subscriberId",{
  firstName: "Pawan";
  lastName: "Jain";
  email: "pawan.jain@domain.com";
  phone: "+1234567890";
  avatar: "https://gravatar.com/avatar/553b157d82ac2880237566d5a644e5fe?s=400&d=robohash&r=x";
  locale: "en-US";
  data: {
    isDeveloper : true
    customKey: "customValue"
    customKey2: "customValue2"
  };
})
```

- #### update provider credentials
```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

// update fcm token
await novu.subscribers.setCredentials("subscriberId", "fcm", {
  deviceTokens: ["token1", "token2"]
})

// update slack webhookurl
await novu.subscribers.setCredentials("subscriberId", "slack", {
  webhookUrl: ["webhookUrl"]
})
```

- #### delete provider credentials
```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

// delete fcm token
await novu.subscribers.deleteCredentials("subscriberId", "fcm")

// delete slack webhookurl
await novu.subscribers.deleteCredentials("subscriberId", "slack")
```

- #### delete a subscriber

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.subscribers.delete("subscriberId")
```

- #### update online status 

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

// mark subscriber as offline
await novu.subscribers.updateOnlineStatus("subscriberId", false)
```

- #### get subscriber preference for all workflows
```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

await novu.subscribers.getPreference("subscriberId")
```

- #### update subscriber preference for a workflow
```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

// enable in-app channel
await novu.subscribers.updatePreference("subscriberId", "workflowId", {
  channel: {
    type: "in_app"
    enabled: true
  }
})


// disable email channel
await novu.subscribers.updatePreference("subscriberId", "workflowId", {
  channel: {
    type: "email"
    enabled: 
  }
})
```

- #### get in-app messages (notifications) feed for subsriber

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

const params = {
  page: 0;
  limit: 20;
  // copy this value from in-app editor
  feedIdentifier: "feedId";
  seen: true
  read: false
  payload: {
    "customkey": "customValue"
  }
}

await novu.subscribers.getNotificationsFeed("subscriberId", params);
```

- #### get seen/unseen in-app messages (notifications) count
```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

// get seen count
await novu.subscribers.getUnseenCount("subscriberId", true);

// get unseen count
await novu.subscribers.getUnseenCount("subscriberId", false);
```

- #### mark an in-app message (notification) as seen/unseen/read/unread

```ts
import { Novu } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

// mark unseen
await novu.subscribers.markMessageAs("subscriberId", "messageId", {
  seen: false
});

// mark seen and unread
await novu.subscribers.markMessageAs("subscriberId", "messageId", {
  seen: true,
  read: false
});
```

- #### mark all in-app messages (notifications) as seen/unseen/read/unread

```ts
import { Novu, MarkMessagesAsEnum } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

// mark all messages as seen
await novu.subscribers.markAllMessagesAs("subscriberId", MarkMessageAsEnum.SEEN, "feedId");

// mark all messages as read
await novu.subscribers.markAllMessagesAs("subscriberId", MarkMessageAsEnum.READ, "feedId");
```

- #### mark in-app message (notification) action as seen

```ts
import { Novu, ButtonTypeEnum, MessageActionStatusEnum } from '@novu/node';

const novu = new Novu('<NOVU_API_KEY>');

// mark a message's primary action button as pending
await novu.subscribers.markMessageActionSeen("subscriberId", "messageId", ButtonTypeEnum.PRIMARY, {
  status: MessageActionStatusEnum.PENDING
});

// mark a message's secondary action button as done
await novu.subscribers.markMessageActionSeen("subscriberId", "messageId", ButtonTypeEnum.SECONDARY, {
  status: MessageActionStatusEnum.DONE
});
```


### Events
