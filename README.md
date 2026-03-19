<div align="center">
  <a href="https://go.novu.co/github" target="_blank" rel="noopener noreferrer"
>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2233092/213641039-220ac15f-f367-4d13-9eaf-56e79433b8c1.png">
    <img alt="Novu Logo" src="https://user-images.githubusercontent.com/2233092/213641043-3bbb3f21-3c53-4e67-afe5-755aeb222159.png" width="280"/>
  </picture>
  </a>
</div>

<br/>
<p align="center">
  <a href="https://www.producthunt.com/products/novu" target="_blank" rel="noopener noreferrer"
>
    <img src="https://img.shields.io/badge/Product%20Hunt-Golden%20Kitty%20Award%202023-yellow" alt="Product Hunt">
  </a>
  <a href="https://news.ycombinator.com/item?id=38419513" target="_blank" rel="noopener noreferrer"
><img src="https://img.shields.io/badge/Hacker%20News-%231-%23FF6600" alt="Hacker News"></a>
  <a href="https://www.npmjs.com/package/@novu/react" target="_blank" rel="noopener noreferrer"
>
    <img src="https://img.shields.io/npm/v/@novu/react" alt="NPM">
  </a>
  <a href="https://www.npmjs.com/package/@novu/react" target="_blank" rel="noopener noreferrer"
>
    <img src="https://img.shields.io/npm/dm/@novu/react" alt="npm downloads">
  </a>
</p>

<h1 align="center">
 The &lt;Inbox /&gt; infrastructure for modern products
</h1>

<div align="center">
  The notification platform that turns complex multi-channel delivery into a single component. Built for developers, designed for growth, powered by open source.
</div>

<p align="center">
  <br />
  <a href="https://go.novu.co/github?utm_campaign=readme_learn_more" rel="dofollow"><strong>Learn More »</strong></a>
  <br />

<br/>
  <a href="https://github.com/novuhq/novu/issues/new?assignees=&labels=type%3A+bug&template=bug_report.yml&title=%F0%9F%90%9B+Bug+Report%3A+" target="_blank" rel="noopener noreferrer"
>Report a bug</a>
  ·
  <a href="https://docs.novu.co" target="_blank" rel="noopener noreferrer"
>Docs</a>
  ·
  <a href="https://go.novu.co/github?utm_campaign=readme_website" target="_blank" rel="noopener noreferrer"
>Website</a>
  ·
  <a href="https://discord.novu.co" target="_blank" rel="noopener noreferrer"
>Join our Discord</a>
  ·
  <a href="https://go.novu.co/changelog" target="_blank" rel="noopener noreferrer"
>Changelog</a>
  ·
  <a href="https://go.novu.co/roadmap" target="_blank" rel="noopener noreferrer"
>Roadmap</a>
  ·
  <a href="https://twitter.com/novuhq" target="_blank" rel="noopener noreferrer"
>X</a>
  ·
  <a href="https://novu.co/contact-us/?utm_campaign=github-readme" target="_blank" rel="noopener noreferrer"
>Contact us</a>
.
<a href="https://www.recent.dev">Recent.dev</a>
</p>

## ⭐️ Why Novu?

Novu provides a unified API that makes it simple to send notifications through multiple channels, including Inbox/In-App, Push, Email, SMS, and Chat.
With Novu, you can create custom workflows and define conditions for each channel, ensuring that your notifications are delivered in the most effective way possible.

## ✨ Features

- Embeddable Inbox component with real-time support
- Single API for all messaging providers (Inbox/In-App, Email, SMS, Push, Chat)
- Digest Engine to combine multiple notification in to a single E-mail
- No-Code Block Editor for Email
- Notification Workflow Engine
- Embeddable user preferences component gives your subscribers control over their notifications
- Community-driven

## 🚀 Getting Started

[Create a free account](https://go.novu.co/dashboard?utm_campaign=github-readme) and follow the instructions on the dashboard.

## 📚 Table of contents

- [Getting Started](https://github.com/novuhq/novu#-getting-started)
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

## Embeddable Inbox component

Using the Novu API and admin panel, you can easily add a real-time notification center to your web app without building it yourself. You can use our [React](https://docs.novu.co/inbox/react/get-started?utm_campaign=github-readme), or build your own via our API and SDK. React native, Vue, and Angular are coming soon.

<div align="center">
<img width="4800" height="2700" alt="Novu's Embeddable Inbox components" src="https://github.com/user-attachments/assets/00224c75-7ed0-4e19-b6fd-2a0bdced6258" />

Read more about how to add a [notification center Inbox](https://docs.novu.co/inbox/react/get-started?utm_campaign=github-readme) to your app.

</div>

## Providers

Novu provides a single API to manage providers across multiple channels with a simple-to-use API and UI interface.

#### 💌 Email

- [x] [Sendgrid](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/sendgrid)
- [x] [Netcore](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/netcore)
- [x] [Mailgun](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mailgun)
- [x] [SES](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/ses)
- [x] [Postmark](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/postmark)
- [x] [Custom SMTP](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/nodemailer)
- [x] [Mailjet](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mailjet)
- [x] [Mandrill](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mandrill)
- [x] [Brevo (formerly SendinBlue)](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/brevo)
- [x] [MailerSend](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mailersend)
- [x] [Infobip](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/infobip)
- [x] [Resend](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/resend)
- [x] [SparkPost](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/sparkpost)
- [x] [Outlook 365](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/outlook365)

#### 📞 SMS

- [x] [Twilio](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/twilio)
- [x] [Plivo](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/plivo)
- [x] [SNS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sns)
- [x] [Nexmo - Vonage](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/nexmo)
- [x] [Sms77](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sms77)
- [x] [Telnyx](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/telnyx)
- [x] [Termii](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/termii)
- [x] [Gupshup](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/gupshup)
- [x] [SMS Central](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sms-central)
- [x] [Maqsam](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/maqsam)
- [x] [46elks](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/forty-six-elks)
- [x] [Clickatell](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/clickatell)
- [x] [Burst SMS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/burst-sms)
- [x] [Firetext](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/firetext)
- [x] [Infobip](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/infobip)
- [ ] Bandwidth
- [ ] RingCentral

#### 📱 Push

- [x] [FCM](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/fcm)
- [x] [Expo](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/expo)
- [x] [APNS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/apns)
- [x] [OneSignal](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/one-signal)
- [x] [Pushpad](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/pushpad)
- [ ] Pushwoosh

#### 👇 Chat

- [x] [Slack](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/slack)
- [x] [Discord](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/discord)
- [x] [MS Teams](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/msTeams)
- [x] [Mattermost](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/mattermost)

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

Novu is a commercial open source company, which means some parts of this open source repository require a commercial license. The concept is called "Open Core," where the core technology is fully open source, licensed under MIT license, and the enterprise code is covered under a commercial license ("/enterprise" Enterprise Edition). Enterprise features are built by the core engineering team of Novu which is hired in full-time.

The following modules and folders are licensed under the enterprise license:

- `enterprise` folder at the root of the project and all of their subfolders and modules
- `apps/web/src/ee` folder and all of their subfolders and modules
- `apps/dashboard/src/ee` folder and all of their subfolders and modules

## 💪 Thanks to all of our contributors

Thanks a lot for spending your time helping Novu grow. Keep rocking 🥂

<a href="https://novu.co/contributors?utm_source=github" target="_blank" rel="noopener noreferrer"
>
  <img src="https://contributors-img.web.app/image?repo=novuhq/novu" alt="Contributors"/>
</a>
