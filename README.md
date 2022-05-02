
<div align="center">
  
  ![Logo Dark](https://user-images.githubusercontent.com/8872447/165779319-34962ccc-3149-466c-b1da-97fd93254520.png#gh-dark-mode-only)

  
</div>

<div align="center">
  
  ![Logo Light](https://user-images.githubusercontent.com/8872447/165779274-22a190da-3284-487e-bd1e-14983df12cbb.png#gh-light-mode-only)
  
</div>


<h1 align="center">Notification management simplified.</h1>

<div align="center">
The ultimate service for managing multi-channel notifications with a single API. 
</div>

  <p align="center">
    <br />
    <a href="https://docs.novu.co" rel="dofollow"><strong>Explore the docs »</strong></a>
    <br />

  <br/>
    <a href="https://github.com/novuhq/novu/issues">Report Bug</a>
    ·
    <a href="https://github.com/novuhq/novu/discussions">Request Feature</a>
    ·
  <a href="https://discord.gg/TT6TttXjRe">Join Our Discord</a>
    ·
    <a href="https://github.com/orgs/novuhq/projects/2">Roadmap</a>
  </p>
  
## ⭐️ Why
Building a notification system is hard, at first it seems like just sending an email but in reality it's just the beginning. In today's world users expect multi channel communication experience over email, sms, push, direct and more... An ever growing list of providers are popping up each day, and notifications are spread around the code. Novu's goal is to simplify notifications and provide developers the tools to create meaningful communication between the system and it's users.

## ✨ Features

- 🌈 Single API for all messaging providers (Email, SMS, Push, Direct)
- 💅 Easily manage notification over multiple channels
- 🚀 Equipped with a CMS for advanced layouts and design management
- 🛡 Built-in protection for missing variables
- 📦 Easy to set up and integrate
- 📦 Embeddable notification center with real-time updates
- 🛡 Debug and analyze multi channel messages in a single dashboard
- 👨‍💻 Community driven

# Novu API & Admin panel (alpha)
We are excited to launch the complete Novu API and admin panel. Want to give it a test before the official release? here is how:
```
npx novu init
```
After setting up your account using the cloud or docker version you can trigger the API using the `@novu/node` package.

```bash
npm install @novu/node
```

```ts
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.trigger('<TRIGGER_NAME>',
  {
    to: {
      subscriberId: '<UUNIQUE_IDENTIFIER>',
      email: 'john@doemail.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    payload: {
      name: "Hello World",
      organization: {
        logo: 'https://happycorp.com/logo.png',
      },
    },
  }
);
```

## Providers
Novu provides a single API to manage providers across multiple channels with a simple to use interface.

#### 💌 Email
- [x] [Sendgrid](https://github.com/novuhq/novu/tree/main/providers/sendgrid)
- [x] [Mailgun](https://github.com/novuhq/novu/tree/main/providers/mailgun)
- [x] [SES](https://github.com/novuhq/novu/tree/main/providers/ses)
- [x] [Postmark](https://github.com/novuhq/novu/tree/main/providers/postmark)
- [x] [NodeMailer](https://github.com/novuhq/novu/tree/main/providers/nodemailer)
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
- [ ] Novu
- [ ] MagicBell

#### Other (Coming Soon...)
- [ ] PagerDuty

## 🔗 Links
- [Home page](https://novu.co/)
