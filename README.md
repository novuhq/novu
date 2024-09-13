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
  The open source notifications framework that makes it easy for developers to empower product teams.
</h1>

<div align="center">
  Novu is the easy button for developer teams that need to quickly integrate notifications into their application, and enable product teams to own notifications content and messaging.
</div>

<p align="center">
  <br />
  <a href="https://docs.novu.co?utm_campaign=github-readme" rel="dofollow"><strong>Explore the docs »</strong></a>
  <br />
  or
  <br />
  <a href="https://dashboard.novu.co?utm_campaign=github-readme" rel="dofollow"><strong>Create a free account »</strong></a>
  <br />

<br/>
  <a href="https://github.com/novuhq/novu/issues/new?assignees=&labels=type%3A+bug&template=bug_report.yml&title=%F0%9F%90%9B+Bug+Report%3A+">Report a bug</a>
  ·
  <a href="https://github.com/novuhq/novu/issues/new?assignees=&labels=feature&template=feature_request.yml&title=%F0%9F%9A%80+Feature%3A+">Request a feature</a>
  ·
<a href="https://bit.ly/novu-github-discord">Join our Discord</a>
  ·
  <a href="https://bit.ly/novu-github-roadmap">Roadmap</a>
  ·
  <a href="https://twitter.com/novuhq">X</a>
  ·
  <a href="https://novu.co/contact-us/?utm_campaign=github-readme">Contact us</a>
</p>

## ⭐️ Why Novu?

Novu provides a unified API that makes it simple to send notifications through multiple channels, including Inbox/In-App, Push, Email, SMS, and Chat.
With Novu, you can create custom workflows and define conditions for each channel, ensuring that your notifications are delivered in the most effective way possible.

## ✨ Features

- 🌈 Single API for all messaging providers (Inbox/In-App, Email, SMS, Push, Chat)
- 💅 Fully managed GitOps flow, deployed from your CI
- 🔥 Define workflow and step controls with Zod or JSON Schema
- 💌 Easily re-use existing content in various frameworks, including React Email, Vue-email, Maizzle, MJML, and more
- 🚀 Equipped with a CMS for advanced layouts and design management
- 🛡 Debug and analyze multi-channel messages in a single dashboard
- 📦 Embeddable Inbox component with real-time updates
- 📤 Embeddable user preferences component gives your subscribers control over their notifications
- 👨‍💻 Community-driven

## 🚀 Getting Started

There are two ways to get started:

1. type the following command in your terminal.

```bash
npx novu@latest dev
```
2. [Create a free cloud account](https://dashboard.novu.co?utm_campaign=github-readme)

## 📚 Table of contents

- [Getting Started](https://github.com/novuhq/novu#-getting-started)
- [GitOps & React Email Integration](https://github.com/novuhq/novu#-gitops)
- [Embeddable Inbox and Preferences](https://github.com/novuhq/novu#embeddable-notification-center)
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

## Notification workflows as code

For API documentation and reference, please visit our [API Reference](https://docs.novu.co/api-reference/overview?utm_campaign=github-readme).

```ts
import { workflow, CronExpression } from '@novu/framework';
import { z } from 'zod';
import { render } from '@react-email/render';

const commentWorkflow = workflow('comment-workflow', async (event) => {
  const digest = await event.step.digest('digest-comments', (controls) => ({
    cron: controls.schedule
  }), { controlSchema: z.object({ schedule: z.nativeEnum(CronExpression) }) });

  await event.step.email('digest-email', async (controls) => ({
    subject: controls.subject,
    body: render(<WeeklyDigestEmail { ...controls } events = { digest.events } />)
  }), {
    skip: () => !digest.events.length,
    controlSchema: z.object({
      subject: z.string().default('Hi {{subscriber.firstName}} - Acme Comments'),
      openAiModel: z.enum(['gpt-3.5-turbo', 'gpt-4o']).default('gpt-4o'),
      aiPrompt: z.string().default('Produce a concise comment digest'),
    })
  });
}, { payloadSchema: z.object({ name: z.string(), comment: z.string() }) });

await commentWorkflow.trigger({
  payload: { name: 'John', comment: 'Are you free to give me a call?' },
  to: 'jane@acme.com'
});

```

## Embeddable Inbox component

Using the Novu API and admin panel, you can easily add a real-time notification center to your web app without building it yourself. You can use our [React](https://docs.novu.co/inbox/react/get-started?utm_campaign=github-readme), or build your own via our API and SDK. React native, Vue, and Angular are coming soon.

<div align="center">
<img width="762" alt="notification-center-912bb96e009fb3a69bafec23bcde00b0" src="https://novu.co/static/6e670ba56ed7a65c7f5ccff5d58c56fb/a9e85/inbox.webp" alt-text="GIF of Novu's Embeddable Notification Center">

Read more about how to add a [notification center Inbox](https://docs.novu.co/inbox/react/get-started?utm_campaign=github-readme) to your app.
</div>

## Providers

Novu provides a single API to manage providers across multiple channels with a simple-to-use API and UI interface.

#### 💌 Email

- [x] [Sendgrid](https://github.com/novuhq/novu/tree/main/providers/sendgrid)
- [x] [Netcore](https://github.com/novuhq/novu/tree/main/providers/netcore)
- [x] [Mailgun](https://github.com/novuhq/novu/tree/main/providers/mailgun)
- [x] [SES](https://github.com/novuhq/novu/tree/main/providers/ses)
- [x] [Postmark](https://github.com/novuhq/novu/tree/main/providers/postmark)
- [x] [Custom SMTP](https://github.com/novuhq/novu/tree/main/providers/nodemailer)
- [x] [Mailjet](https://github.com/novuhq/novu/tree/main/providers/mailjet)
- [x] [Mandrill](https://github.com/novuhq/novu/tree/main/providers/mandrill)
- [x] [Brevo (formerly SendinBlue)](https://github.com/novuhq/novu/tree/main/providers/brevo)
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

- [x] [Novu](https://docs.novu.co/inbox/react/get-started?utm_campaign=github-readme)

## 📋 Read Our Code Of Conduct

Before you begin coding and collaborating, please read our [Code of Conduct](https://github.com/novuhq/novu/blob/main/CODE_OF_CONDUCT.md) thoroughly to understand the standards (that you are required to adhere to) for community engagement. As part of our open-source community, we hold ourselves and other contributors to a high standard of communication. As a participant and contributor to this project, you agree to abide by our [Code of Conduct](https://github.com/novuhq/novu/blob/main/CODE_OF_CONDUCT.md).

## 💻 Need Help?

We are more than happy to help you. If you are getting any errors or facing problems while working on this project, join our [Discord server](https://discord.novu.co) and ask for help. We are open to discussing anything related to the project.

## 🔗 Links

- [Home page](https://novu.co?utm_campaign=github-readme)
- [Contribution guidelines](https://github.com/novuhq/novu/blob/main/CONTRIBUTING.md)
- [Run Novu locally](https://docs.novu.co/community/run-in-local-machine?utm_campaign=github-readme)

## 🛡️ License

Novu is licensed under the MIT License - see the [LICENSE](https://github.com/novuhq/novu/blob/main/LICENSE) file for details.

## 💪 Thanks to all of our contributors

Thanks a lot for spending your time helping Novu grow. Keep rocking 🥂

<a href="https://novu.co/contributors?utm_source=github">
  <img src="https://contributors-img.web.app/image?repo=novuhq/novu" alt="Contributors"/>
</a>
