<p align="center">
  <a href="https://discord.gg/9wcGSf22PM">
    <img src="https://user-images.githubusercontent.com/8877285/139603641-66966234-84f4-42aa-9c31-9d296fab7ba1.png">
  </a>
</p>
<p align="center">Read <a href="https://github.com/notifirehq/notifire/discussions/70">here</a> our plans for the upcoming weeks.</p>

<p align="center">
  <a href="https://notifire.co">
    <img width="200" src="https://uploads-ssl.webflow.com/6130b4d29bb0ab09e14ae9ee/6130e6931f755df302203fcc_SideLogo%20-%20BLack-p-800.png">
  </a>
</p>
<h1 align="center">Notification management simplified.</h1>

<div align="center">
The ultimate library for managing multi-channel notifications with a single API. 
</div>

  <p align="center">
    <br />
    <a href="https://docs.notifire.co"><strong>Explore the docs »</strong></a>
    <br />
  <br/>
    <a href="https://github.com/notifirehq/notifire/issues">Report Bug</a>
    ·
    <a href="https://github.com/notifirehq/notifire/discussions">Request Feature</a>
    ·
    <a href="https://blog.notifire.co/">Read our blog</a>
  </p>
  
## ⭐️ Why
Building a notification system is hard, at first it seems like just sending an email but in reality it's just the beginning. In today's world users expect multi channel communication experience over email, sms, push, direct and more... An ever growing list of providers are popping up each day, and notifications are spread around the code. Notifire's goal is to simplify notifications and provide developers the tools to create meaningful communication between the system and it's users.

## ✨ Features

- 🌈 Single API for all messaging providers (Email, SMS, Push, Direct)
- 💅 Easily manage notification over multiple channels
- 🚀 Equipped with a templating engine for advanced layouts and designs 
- 🛡 Built-in protection for missing variables
- 📦 Easy to set up and integrate
- 🛡 Written in TypeScript with predictable static types.
- 👨‍💻 Community driven

## 📦 Install

```bash
npm install @notifire/core
```

```bash
yarn add @notifire/core
```

## 🔨 Usage

```ts
import { Notifire, ChannelTypeEnum } from '@notifire/core';
import { SendgridEmailProvider } from '@notifire/sendgrid';

const notifire = new Notifire();

await notifire.registerProvider(
  new SendgridEmailProvider({
    apiKey: process.env.SENDGRID_API_KEY,
    from: 'sender@mail.com'
  })
);

const passwordResetTemplate = await notifire.registerTemplate({
  id: 'password-reset',
  messages: [
    {
      subject: `You password reset request`,
      // Or for translation or custom logic you can use function syntax
      // subject: (payload: ITriggerPayload) => getTranslation('resetPasswordSubject', payload.language),
      channel: ChannelTypeEnum.EMAIL,
      template: `
          Hi {{firstName}}!
          
          To reset your password click <a href="{{resetLink}}">here.</a>
          
          {{#if organization}}
            <img src="{{organization.logo}}" />
          {{/if}}
      `
    },
  ]
});

await notifire.trigger('<REPLACE_WITH_EVENT_NAME>', {
  $user_id: "<USER IDENTIFIER>",
  $email: "test@email.com",
  firstName: "John",
  lastName: "Doe",
  language: "en",
  organization: {
    logo: 'https://evilcorp.com/logo.png'
  }
});
```

## Providers
Notifire provides a single API to manage providers across multiple channels with a single to use interface.

#### 💌 Email
- [x] [Sendgrid](https://github.com/notifirehq/notifire/tree/master/providers/sendgrid)
- [x] [Mailgun](https://github.com/notifirehq/notifire/tree/master/providers/mailgun)
- [x] [SES](https://github.com/notifirehq/notifire/tree/master/providers/ses)
- [x] [Postmark](https://github.com/notifirehq/notifire/tree/master/providers/postmark)
- [x] [NodeMailer](https://github.com/notifirehq/notifire/tree/master/providers/nodemailer)
- [x] [Mailjet](https://github.com/notifirehq/notifire/tree/master/providers/mailjet)
- [x] [Mandrill](https://github.com/notifirehq/notifire/tree/master/providers/mandrill)
- [x] [SendinBlue](https://github.com/notifirehq/notifire/tree/master/providers/sendinblue)
- [x] [EmailJS](https://github.com/notifirehq/notifire/tree/master/providers/emailjs)
- [ ] SparkPost

#### 📞 SMS
- [x] [Twilio](https://github.com/notifirehq/notifire/tree/master/providers/twilio)
- [x] [Plivo](https://github.com/notifirehq/notifire/tree/master/providers/plivo)
- [x] [SNS](https://github.com/notifirehq/notifire/tree/master/providers/sns)
- [x] [Nexmo - Vonage](https://github.com/notifirehq/notifire/tree/master/providers/nexmo)
- [x] [Sms77](https://github.com/notifirehq/notifire/tree/master/providers/sms77)
- [x] [Telnyx](https://github.com/notifirehq/notifire/tree/master/providers/telnyx)
- [ ] Bandwidth
- [ ] RingCentral

#### 📱 Push (Coming Soon...)
- [ ] Pushwoosh
- [ ] SNS

#### 👇 Direct (Coming Soon...)
- [ ] Slack
- [ ] MS Teams
- [ ] Discord
- [ ] Mattermost

#### 📱 In-App (Coming Soon...)
- [ ] Notifire
- [ ] MagicBell

#### Other (Coming Soon...)
- [ ] PagerDuty

## 🔗 Links
- [Home page](https://notifire.co/)
