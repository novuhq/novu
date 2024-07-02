<div align="center">
  <a href="https://novu.co?utm_source=github" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2233092/213641039-220ac15f-f367-4d13-9eaf-56e79433b8c1.png">
    <img alt="Novu Logo" src="https://user-images.githubusercontent.com/2233092/213641043-3bbb3f21-3c53-4e67-afe5-755aeb222159.png" width="280"/>
  </picture>
  </a>
</div>

<br/>

<p align="center">
  <a href="https://www.npmjs.com/package/@novu/node">
    <img src="https://img.shields.io/npm/v/@novu/node" alt="NPM">
  </a>
  <a href="https://www.npmjs.com/package/@novu/node">
    <img src="https://img.shields.io/npm/dm/@novu/node" alt="npm downloads">
  </a>
  <a href="https://github.com/novuhq/novu/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/novuhq/novu" alt="MIT">
  </a>
</p>

<h1 align="center">
  The open-source notification infrastructure for developers
</h1>

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
  <a href="https://roadmap.novu.co">Roadmap</a>
  ·
  <a href="https://twitter.com/novuhq">X</a>
  ·
  <a href="https://notifications.directory">Notifications Directory</a>
</p>

## ⭐️ Why Novu?

Novu provides a unified API that makes it simple to send notifications through multiple channels, including In-App, Push, Email, SMS, and Chat.
With Novu, you can create custom workflows and define conditions for each channel, ensuring that your notifications are delivered in the most effective way possible.

## ✨ Features

- 🌈 Single API for all messaging providers (In-App, Email, SMS, Push, Chat)
- 💅 Fully managed GitOps Flow, deployed from your CI
- 🔥 Define workflow and step validations with Zod or JSON Schema
- 💌 React Email/Maizzle/MJML integrations
- 🚀 Equipped with a CMS for advanced layouts and design management
- 🛡 Debug and analyze multi-channel messages in a single dashboard
- 📦 Embeddable notification center with real-time updates
- 👨‍💻 Community-driven

## 🚀 Getting Started

To get started, type the following command in your Terminal.

```bash
npx novu-labs@latest echo
```

## 📚 Table Of Contents

- [Getting Started](https://github.com/novuhq/novu#-getting-started)
- [GitOps & React Email Integration](https://github.com/novuhq/novu#-gitops)
- [Embeddable notification center](https://github.com/novuhq/novu#embeddable-notification-center)
- [Providers](https://github.com/novuhq/novu#providers)
  - [Email](https://github.com/novuhq/novu#-email)
  - [SMS](https://github.com/novuhq/novu#-sms)
  - [Push](https://github.com/novuhq/novu#-push)
  - [Chat](https://github.com/novuhq/novu#-chat)
  - [In-App](https://github.com/novuhq/novu#-in-app)
  - [Others](https://github.com/novuhq/novu#other-coming-soon)
- [Need Help?](https://github.com/novuhq/novu#-need-help)
- [Links](https://github.com/novuhq/novu#-links)
- [License](https://github.com/novuhq/novu#%EF%B8%8F-license)

## Notification Workflows as Code

For API documentation and reference, please visit [Echo API Reference](https://docs.novu.co/framework/quickstart?utm_campaign=github-readme).

```ts

client.workflow('comment-on-post', async ({step, subscriber}) => {
  const inAppResponse = await step.inApp('in-app-step', async (controls) => {
    return {
      body: renderReactComponent(controls)
    };
  }, {
    controlSchema: {
      // ...JSON Schema or ZOD/Ajv/Class Validators definition
    }
  });

  // Novu Worker Engine will manage the state and durability of each step in isolation
  const { events } = await step.digest('1 day');

  await step.email('email-step', async () => {
    return {
      subject: 'E-mail Subject',
      body: renderReactEmail(<ReactEmailComponent events={digestedEvents} />);
    }
  }, {
    // Step-level controls defined in code and controlled in the novu Cloud UI by a Non-Technical Team member
    controlSchema: {
      // ...JSON Schema
    },
    providers: {
      sendgrid: async (controls) => {
        // Echo runs as part of your application, so you have access to your database or resources

        return {
          to: email,
          ipPoolName: 'custom-pool'
        };
      }
    },
    skip: () => {
      // Write custom skip logic
      return inAppResponse.seen || subscriber.isOnline;
    }
  });
// Define your workflow trigger payload using json schema and custom validation;
}, {
  payloadSchema: {
    // ...JSON Schema
  }
});

```

## Embeddable Notification Center

Using the Novu API and admin panel, you can easily add a real-time notification center to your web app without building it yourself. You can use our [React](https://docs.novu.co/notification-center/client/react/get-started?utm_campaign=github-readme) / [Vue](https://docs.novu.co/notification-center/client/vue?utm_campaign=github-readme) / [Angular](https://docs.novu.co/notification-center/client/angular?utm_campaign=github-readme) components or an [iframe embed](https://docs.novu.co/notification-center/client/iframe?utm_campaign=github-readme), as well as a [Web component](https://docs.novu.co/notification-center/client/web-component?utm_campaign=github-readme).

<div align="center">
<img width="762" alt="notification-center-912bb96e009fb3a69bafec23bcde00b0" src="https://user-images.githubusercontent.com/80174214/193887395-f1c95042-b4e6-480e-a89c-a78aa247fa90.gif" alt-text="GIF of Novu's Embeddable Notification Center">

Read more about how to add a notification center to your app with the Novu API [here](https://docs.novu.co/notification-center/getting-started?utm_campaign=github-readme)

<p align="center">
  <a href="https://docs.novu.co/sdks/react?utm_campaign=github-readme">React Component</a>
  · <a href="https://docs.novu.co/sdks/vue?utm_campaign=github-readme">Vue Component</a>
  · <a href="https://docs.novu.co/sdks/angular?utm_campaign=github-readme">Angular Component</a>
  </p>
  
</div>

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
- [x] [MailerSend](https://github.com/novuhq/novu/tree/main/providers/mailersend)
- [x] [Infobip](https://github.com/novuhq/novu/tree/main/providers/infobip)
- [x] [Resend](https://github.com/novuhq/novu/tree/main/providers/resend)
- [x] [SparkPost](https://github.com/novuhq/novu/tree/main/providers/sparkpost)
- [x] [Outlook 365](https://github.com/novuhq/novu/tree/main/providers/outlook365)

#### 📞 SMS

- [x] [Twilio](https://github.com/novuhq/novu/tree/main/providers/twilio)
- [x] [Plivo](https://github.com/novuhq/novu/tree/main/providers/plivo)
- [x] [SNS](https://github.com/novuhq/novu/tree/main/providers/sns)
- [x] [Nexmo - Vonage](https://github.com/novuhq/novu/tree/main/providers/nexmo)
- [x] [Sms77](https://github.com/novuhq/novu/tree/main/providers/sms77)
- [x] [Telnyx](https://github.com/novuhq/novu/tree/main/providers/telnyx)
- [x] [Termii](https://github.com/novuhq/novu/tree/main/providers/termii)
- [x] [Gupshup](https://github.com/novuhq/novu/tree/main/providers/gupshup)
- [x] [SMS Central](https://github.com/novuhq/novu/tree/main/providers/sms-central)
- [x] [Maqsam](https://github.com/novuhq/novu/tree/main/providers/maqsam)
- [x] [46elks](https://github.com/novuhq/novu/tree/main/providers/forty-six-elks)
- [x] [Clickatell](https://github.com/novuhq/novu/tree/main/providers/clickatell)
- [x] [Burst SMS](https://github.com/novuhq/novu/tree/main/providers/burst-sms)
- [x] [Firetext](https://github.com/novuhq/novu/tree/main/providers/firetext)
- [x] [Infobip](https://github.com/novuhq/novu/tree/main/providers/infobip)
- [ ] Bandwidth
- [ ] RingCentral

#### 📱 Push

- [x] [FCM](https://github.com/novuhq/novu/tree/main/providers/fcm)
- [x] [Expo](https://github.com/novuhq/novu/tree/main/providers/expo)
- [x] [APNS](https://github.com/novuhq/novu/tree/main/providers/apns)
- [x] [OneSignal](https://github.com/novuhq/novu/tree/main/providers/one-signal)
- [x] [Pushpad](https://github.com/novuhq/novu/tree/main/providers/pushpad)
- [ ] Pushwoosh

#### 👇 Chat

- [x] [Slack](https://github.com/novuhq/novu/tree/main/providers/slack)
- [x] [Discord](https://github.com/novuhq/novu/tree/main/providers/discord)
- [x] [MS Teams](https://github.com/novuhq/novu/tree/main/providers/ms-teams)
- [x] [Mattermost](https://github.com/novuhq/novu/tree/main/providers/mattermost)

#### 📱 In-App

- [x] [Novu](https://docs.novu.co/notification-center/getting-started?utm_campaign=github-readme)

#### Other (Coming Soon...)

- [ ] PagerDuty

## 📋 Read Our Code Of Conduct

Before you begin coding and collaborating, please read our [Code of Conduct](https://github.com/novuhq/novu/blob/main/CODE_OF_CONDUCT.md) thoroughly to understand the standards (that you are required to adhere to) for community engagement. As part of our open-source community, we hold ourselves and other contributors to a high standard of communication. As a participant and contributor to this project, you agree to abide by our [Code of Conduct](https://github.com/novuhq/novu/blob/main/CODE_OF_CONDUCT.md).

## 💻 Need Help?

We are more than happy to help you. If you are getting any errors or facing problems while working on this project, join our [Discord server](https://discord.novu.co) and ask for help. We are open to discussing anything related to the project.

## 🔗 Links

- [Home page](https://novu.co?utm_campaign=github-readme)
- [Contribution Guidelines](https://github.com/novuhq/novu/blob/main/CONTRIBUTING.md)
- [Run Novu Locally](https://docs.novu.co/community/run-in-local-machine?utm_campaign=github-readme)

## 🛡️ License

Novu is licensed under the MIT License - see the [LICENSE](https://github.com/novuhq/novu/blob/main/LICENSE) file for details.

## 💪 Thanks To All Contributors

Thanks a lot for spending your time helping Novu grow. Keep rocking 🥂

<a href="https://novu.co/contributors?utm_source=github">
  <img src="https://contributors-img.web.app/image?repo=novuhq/novu" alt="Contributors"/>
</a>
