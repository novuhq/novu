<div align="center">
  
![hacktoberfest-readme-dark (1)](https://user-images.githubusercontent.com/63902456/193565711-96d0e494-998f-4f4b-aeb9-9aec80b24851.jpeg#gh-dark-mode-only)

</div>

<div align="center">
  
 ![hacktoberfest-readme-light (1)](https://user-images.githubusercontent.com/63902456/193565889-24b3ac7a-2df9-40f6-83c3-f0d04e531f2e.jpeg#gh-light-mode-only)
 
</div>

</br>
</br>

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/8872447/165779319-34962ccc-3149-466c-b1da-97fd93254520.png">
    <img src="https://user-images.githubusercontent.com/8872447/165779274-22a190da-3284-487e-bd1e-14983df12cbb.png" width="280" alt="Logo"/>
  </picture>
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
  <a href="https://discord.gg/8KpBEjehEV">Join Our Discord</a>
    ·
    <a href="https://github.com/orgs/novuhq/projects/2">Roadmap</a>
    ·
    <a href="https://twitter.com/novuhq">Twitter</a>
  </p>

## ⭐️ Why

Building a notification system is hard; at first it seems like just sending an email, but in reality, it's just the beginning. Users today expect a multi-channel communication experience via email, SMS, push, chat, and other channels. An ever-growing list of providers is popping up each day, and notifications are spread around the code. Novu's goal is to simplify notifications and provide developers the tools to create meaningful communication between the system and its users.

## ✨ Features

- 🌈 Single API for all messaging providers (Email, SMS, Push, Chat)
- 💅 Easily manage notification over multiple channels
- 🚀 Equipped with a CMS for advanced layouts and design management
- 🛡 Built-in protection for missing variables (Coming Soon)
- 📦 Easy to set up and integrate
- 🛡 Debug and analyze multi channel messages in a single dashboard
- 📦 Embeddable notification center with real-time updates
- 👨‍💻 Community driven

## 🚀 Getting Started

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
    to: [{
      subscriberId: '<UNIQUE_IDENTIFIER>',
      email: 'john1@doemail.com',
      firstName: 'John',
      lastName: 'Doe',
    }],
    payload: {
      name: "Hello World",
      organization: {
        logo: 'https://happycorp.com/logo.png',
      },
    },
  }
);
```

## Embeddable notification center

Using the Novu API and admin panel you can easily add real-time notification center to your web-app without the hassle of building it yourself. You can use our React component or an iframe embed if you are not using React.

<div align="center">
<img width="762" alt="notification-center-912bb96e009fb3a69bafec23bcde00b0" src="https://github.com/iampearceman/Design-assets/blob/main/Untitled%20design%20(8).gif?raw=true">
  
  Read more about how to add a notification center to your app with the Novu API [here](https://docs.novu.co/notification-center/getting-started)

</div>

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
- [x] [Termii](https://github.com/novuhq/novu/tree/main/providers/termii)
- [ ] Bandwidth
- [ ] RingCentral

#### 📱 Push 

- [x] FCM
- [ ] Pushwoosh
- [ ] SNS

#### 👇 Chat 

- [x] Slack
- [x] Discord
- [x] MS Teams
- [ ] Mattermost

#### 📱 In-App

- [x] [Novu](https://docs.novu.co/notification-center/getting-started)
- [ ] MagicBell

#### Other (Coming Soon...)

- [ ] PagerDuty


## 💻  Need Help?

We are more than happy to help you. If you are getting some errors or problems while working with the project, or want to discuss something related to the project.

Just <a href="https://discord.gg/novu">Join Our Discord</a> server and ask for help.

## 🔗 Links

- [Home page](https://novu.co/)
- [Contribution Guidelines](https://github.com/novuhq/novu/blob/main/CONTRIBUTING.md)
- [Run Novu Locally](https://docs.novu.co/community/run-locally)

## 🛡️ License

Novu is licensed under the MIT License - see the [LICENSE](https://github.com/novuhq/novu/blob/main/LICENSE) file for details.

## 💪 Thanks to all Contributors

Thanks a lot for spending your time helping Novu grow. Thanks a lot! Keep rocking 🥂

<a href="https://novu.co/contributors">
  <img src="https://contrib.rocks/image?repo=novuhq/novu" />
</a>
