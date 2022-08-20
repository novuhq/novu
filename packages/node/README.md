<p align="center">
  <a href="https://discord.gg/9wcGSf22PM">
    <img src="https://user-images.githubusercontent.com/8877285/139603641-66966234-84f4-42aa-9c31-9d296fab7ba1.png">
  </a>
<p align="center">Read <a href="https://github.com/novuhq/novu/discussions/70">here</a> our plans for the upcoming weeks.</p>

</p>
<p align="center">
  <a href="https://novu.co">
    <img width="200" src="https://uploads-ssl.webflow.com/6130b4d29bb0ab09e14ae9ee/6130e6931f755df302203fcc_SideLogo%20-%20BLack-p-800.png">
  </a>
</p>
<h1 align="center">Notification management simplified.</h1>

<div align="center">
The ultimate library for managing multi-channel notifications with a single API. 
</div>

  <p align="center">
    <br />
    <a href="https://docs.novu.co"><strong>Explore the docs »</strong></a>
    <br />
  <br/>
    <a href="https://github.com/novuhq/novu/issues">Report Bug</a>
    ·
    <a href="https://github.com/novuhq/novu/discussions">Request Feature</a>
    ·
    <a href="https://blog.novu.co/">Read our blog</a>
  </p>
  
## ⭐️ Why
Building a notification system is hard, at first it seems like just sending an email but in reality it's just the beginning. In today's world users expect multi channel communication experience over email, sms, push, chat and more... An ever growing list of providers are popping up each day, and notifications are spread around the code. Novu's goal is to simplify notifications and provide developers the tools to create meaningful communication between the system and it's users.

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

Novu provides a single API to manage providers across multiple channels with a single to use interface.

#### 💌 Email

- [x] [Sendgrid](https://github.com/novuhq/novu/tree/main/providers/sendgrid)
- [x] [Mailgun](https://github.com/novuhq/novu/tree/main/providers/mailgun)
- [x] [SES](https://github.com/novuhq/novu/tree/main/providers/ses)
- [x] [Postmark](https://github.com/novuhq/novu/tree/main/providers/postmark)
- [x] [NodeMailer](https://github.com/novuhq/novu/tree/main/providers/nodemailer)
- [x] [Mailjet](https://github.com/novuhq/novu/tree/main/providers/mailjet)
- [x] [Mandrill](https://github.com/novuhq/novu/tree/main/providers/mandrill)
- [ ] SendinBlue
- [ ] SparkPost

#### 📞 SMS

- [x] [Twilio](https://github.com/novuhq/novu/tree/main/providers/twilio)
- [x] [Plivo](https://github.com/novuhq/novu/tree/main/providers/plivo)
- [x] [SNS](https://github.com/novuhq/novu/tree/main/providers/sns)
- [x] [Nexmo (Vonage)](https://github.com/novuhq/novu/tree/main/providers/nexmo)
- [ ] Bandwidth
- [ ] RingCentral

#### 📱 Push (Coming Soon...)

- [ ] Pushwoosh
- [ ] SNS

#### 👇 Chat (Coming Soon...)

- [ ] Slack
- [ ] MS Teams
- [ ] Discord
- [ ] Mattermost

#### 📱 In-App (Coming Soon...)

- [ ] Novu
- [ ] MagicBell

#### Other (Coming Soon...)

- [ ] PagerDuty

## 🔗 Links

- [Home page](https://novu.co/)
