<p align="center">
  <a href="https://discord.novu.co">
    <img src="https://user-images.githubusercontent.com/8877285/139603641-66966234-84f4-42aa-9c31-9d296fab7ba1.png">
  </a>
<p align="center">Read <a href="https://github.com/novuhq/novu/discussions/70">here</a> our plans for the upcoming weeks.</p>

</p>
<div align="center">
  <a href="https://novu.co">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/8872447/165779319-34962ccc-3149-466c-b1da-97fd93254520.png">
      <img src="https://user-images.githubusercontent.com/8872447/165779274-22a190da-3284-487e-bd1e-14983df12cbb.png" width="280" alt="Logo"/>
    </picture>
  </a>
</div>
<h1 align="center">Notification management simplified.</h1>

<div align="center">
The ultimate library for managing multi-channel notifications with a single API. 
</div>

  <p align="center">
    <br />
    <a href="https://docs.novu.co"><strong>Explore the docs »</strong></a>
    <br />
  <br/>
    <a href="https://github.com/novuhq/novu/issues/new?assignees=&labels=type%3A+bug&template=bug_report.yml&title=%F0%9F%90%9B+Bug+Report%3A+">Report Bug</a>
    ·
    <a href="https://github.com/novuhq/novu/issues/new?assignees=&labels=feature&template=feature_request.yml&title=%F0%9F%9A%80+Feature%3A+">Request Feature</a>
    ·
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
