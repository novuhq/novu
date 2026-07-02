<a href="https://go.novu.co/github?utm_campaign=readme-logo" target="_blank" rel="noopener noreferrer">
  <img alt="Novu Logo" src=".github/assets/novu-logo.svg" width="100%"/>
</a>

<br/>
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
  <a href="https://www.npmjs.com/package/@novu/js" target="_blank" rel="noopener noreferrer"
>
    <img src="https://img.shields.io/npm/dm/@novu/js" alt="npm downloads">
  </a>
</p>

<h1 align="center">
 The open-source communication infrastructure for agents and products
</h1>

<div align="center">
  One API and one unified conversation model to connect your <strong>products</strong> and your <strong>agents</strong> to every channel your users live on — Inbox, Email, SMS, Push, Chat, Slack, Microsoft Teams, Telegram, and more.
</div>

<p align="center">
  <br />
  <a href="https://go.novu.co/github?utm_source=github&utm_medium=readme&utm_campaign=learn-more-link" rel="dofollow"><strong>Learn More »</strong></a>
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
  <a href="https://go.novu.co/contact?utm_source=github&utm_medium=readme&utm_campaign=contact-us-link" target="_blank" rel="noopener noreferrer"
>Contact us</a>

Software is becoming more conversational, and user expectations are rising with it. People no longer want static, irrelevant notifications they glance at and forget, they want to engage, ask questions, and go deeper. Instead of a one-way report dropped in their inbox, they expect a thread they can explore: follow up on a metric, drill into an anomaly, or continue a conversation right where they left off. That shift, from broadcast to meaningful dialog is what Novu's communication infrastructure is built for.

## ⭐️ Why Novu?
 
Every product and every agent eventually needs to talk to people, across the channels those people already use. Novu is the open-source layer that handles that communication for you, so you don't rebuild Inbox feeds, provider integrations, and channel webhooks from scratch every time.
 
There are two ways to build with Novu, and they share the same foundation: a single API and a unified conversation model.
 
- **Communication infrastructure for products** — Send notifications across Inbox/In-App, Email, SMS, Push, and Chat through one API, with workflows, digests, and an embeddable `<Inbox />` component.
- **Agent Communication Infrastructure (ACI)** — Connect any agent you've already built to any communication channel: Slack, Microsoft Teams, Telegram, WhatsApp, email through one conversation model.

## 🚀 Getting Started

[Create a free account](https://go.novu.co/dashboard?utm_source=github&utm_medium=readme&utm_campaign=create-free-account-link) and follow the instructions on the dashboard.

## 📚 Table of contents
 
- [Why Novu?](#️-why-novu)
- [Communication infrastructure for products](#-communication-infrastructure-for-products)
- [Agent Communication Infrastructure (ACI)](#-agent-communication-infrastructure-aci)
- [Getting Started](#-getting-started)
- [Embeddable Inbox and Preferences](#embeddable-inbox-component)
- [Providers](#providers)

## 📬 Communication infrastructure for products
 
The notification platform that turns complex multi-channel delivery into a single component. Built for developers, designed for growth, powered by open source.
 
Novu provides a unified API to send notifications through multiple channels — **Inbox/In-App, Push, Email, SMS, and Chat**. Create custom workflows, define per-channel conditions, and let Novu deliver each notification in the most effective way, without stitching together a provider for every channel yourself.
 
- One API for all messaging providers
- Embeddable, real-time `<Inbox />` component
- Notification workflow engine with branching and conditions
- Digest engine to batch multiple notifications into a single message
- No-code email editor
- Embeddable preferences component so users control their own notifications

## 🤖 Agent Communication Infrastructure (ACI)
 
> **You build the agent. Novu gives it a voice.**
 
ACI is a complete suite for companies already building agents that need to talk to users on real communication channels. It connects your agent to any channel and abstracts away the quirks of each platform behind a single, unified conversation model.
 
Novu handles the plumbing in both directions: it receives inbound messages from each channel, normalizes them into one consistent shape, routes them to your agent, and sends your agent's responses back out, so you integrate once instead of building and maintaining a webhook handler per platform.
 
- **Unified conversation model** — one consistent model across every channel, instead of per-platform message formats and webhook quirks
- **Bidirectional messaging** — receive user messages and send agent replies through the same layer
- **Channel integrations** — Slack, Microsoft Teams, Telegram, WhatsApp, Email, and an In-App Inbox for agents
- **Bring your own agent** — works with whatever you've built, whether that's Claude Managed Agents, AI SDK, LangGraph, or a custom stack; Novu doesn't constrain your agent logic
- **Best practices built in** — conversation threading, reactions, channel-aware formatting, actions and a single integration surface
Novu connects the agent to the world, it is not the agent itself.

### Want to see ACI in action?
We have built [Novu Connect](https://novu.co/connect) to showcase the power of ACI, build on integrate an existing Claude Managed Agent as a teammate in Slack, Telegram, or Email in less than 2 minutes. 

Try it now:
```
npx novu@latest connect
```

## Embeddable Inbox component

Using the Novu API and admin panel, you can easily add a real-time notification center to your web app without building it yourself. You can use our [React](https://docs.novu.co/inbox/react/get-started?utm_source=github&utm_medium=readme&utm_campaign=react-starter-link), or build your own via our API and SDK. React native, Vue, and Angular are coming soon.

<div align="center">
<img width="4800" height="2700" alt="Novu's Embeddable Inbox components" src="https://github.com/user-attachments/assets/00224c75-7ed0-4e19-b6fd-2a0bdced6258" />

Read more about how to add a [notification center Inbox](https://docs.novu.co/inbox/react/get-started?utm_source=github&utm_medium=readme&utm_campaign=read-more-react-link) to your app.

</div>

## Providers

Novu provides a single API to manage providers across multiple channels with a simple-to-use API and UI interface.

Expand a channel below to browse supported providers.

<details>
<summary><strong>💌 Email</strong> (19 providers)</summary>

| Provider |
| --- |
| [Amazon SES](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/ses) |
| [Braze](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/braze) |
| [Brevo](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/brevo) |
| [Custom SMTP](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/nodemailer) |
| [Email Webhook](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/email-webhook) |
| [Email.js](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/emailjs) |
| [Infobip](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/infobip) |
| [MailerSend](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mailersend) |
| [Mailgun](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mailgun) |
| [Mailjet](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mailjet) |
| [Mailtrap](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mailtrap) |
| [Mandrill](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mandrill) |
| [Netcore](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/netcore) |
| [Outlook 365](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/outlook365) |
| [Plunk](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/plunk) |
| [Postmark](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/postmark) |
| [Resend](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/resend) |
| [SendGrid](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/sendgrid) |
| [SparkPost](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/sparkpost) |

</details>

<details>
<summary><strong>📞 SMS</strong> (37 providers)</summary>

| Provider |
| --- |
| [46elks](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/forty-six-elks) |
| [Africa's Talking](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/africas-talking) |
| [Afro SMS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/afro-sms) |
| [Amazon SNS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sns) |
| [Azure SMS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/azure-sms) |
| [Bandwidth](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/bandwidth) |
| [Brevo SMS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/brevo-sms) |
| [Bulk SMS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/bulk-sms) |
| [Burst SMS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/burst-sms) |
| [Clickatell](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/clickatell) |
| [ClickSend](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/clicksend) |
| [CM Telecom](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/cm-telecom) |
| [Eazy SMS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/eazy-sms) |
| [Firetext](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/firetext) |
| [Generic SMS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/generic-sms) |
| [Gupshup](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/gupshup) |
| [iMedia](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/imedia) |
| [Infobip](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/infobip) |
| [iSend SMS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/isend-sms) |
| [iSendPro SMS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/isendpro-sms) |
| [Kannel](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/kannel) |
| [Maqsam](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/maqsam) |
| [MessageBird](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/messagebird) |
| [Mobishastra](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/mobishastra) |
| [Plivo](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/plivo) |
| [RingCentral](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/ring-central) |
| [Sendchamp](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sendchamp) |
| [SimpleTexting](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/simpletexting) |
| [Sinch](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sinch) |
| [SMS Central](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sms-central) |
| [SMS77](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sms77) |
| [SMSMode](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/smsmode) |
| [Telnyx](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/telnyx) |
| [Termii](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/termii) |
| [Twilio](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/twilio) |
| [Unifonic](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/unifonic) |
| [Vonage](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/nexmo) |

</details>

<details>
<summary><strong>📱 Push</strong> (8 providers)</summary>

| Provider |
| --- |
| [APNS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/apns) |
| [App.io](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/appio) |
| [Expo](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/expo) |
| [FCM](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/fcm) |
| [OneSignal](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/one-signal) |
| [Push Webhook](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/push-webhook) |
| [Pusher Beams](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/pusher-beams) |
| [Pushpad](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/pushpad) |

</details>

<details>
<summary><strong>💬 Chat</strong> (12 providers)</summary>

| Provider |
| --- |
| [Chat Webhook](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/chat-webhook) |
| [Discord](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/discord) |
| [GetStream](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/getstream) |
| [Grafana OnCall](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/grafana-on-call) |
| [Mattermost](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/mattermost) |
| [Microsoft Teams](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/msTeams) |
| [Rocket.Chat](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/rocket-chat) |
| [Ryver](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/ryver) |
| [Slack](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/slack) |
| [Telegram](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/telegram) |
| [WhatsApp Business](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/whatsapp-business) |
| [Zulip](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/zulip) |

</details>

<details>
<summary><strong>📥 In-App</strong> (1 provider)</summary>

| Provider |
| --- |
| [Novu Inbox](https://docs.novu.co/inbox/react/get-started?utm_source=github&utm_medium=repository&utm_campaign=inbox-channel-link) |

</details>

## 📋 Read Our Code Of Conduct

Before you begin coding and collaborating, please read our [Code of Conduct](https://github.com/novuhq/novu/blob/main/CODE_OF_CONDUCT.md) thoroughly to understand the standards (that you are required to adhere to) for community engagement. As part of our open-source community, we hold ourselves and other contributors to a high standard of communication. As a participant and contributor to this project, you agree to abide by our [Code of Conduct](https://github.com/novuhq/novu/blob/main/CODE_OF_CONDUCT.md).

## 💻 Need Help?

We are more than happy to help you. If you are getting any errors or facing problems while working on this project, join our [Discord server](https://discord.novu.co) and ask for help. We are open to discussing anything related to the project.

## 🔗 Links

- [Home page](https://novu.co?utm_source=github&utm_medium=readme&utm_campaign=main-link)
- [Contribution guidelines](https://github.com/novuhq/novu/blob/main/CONTRIBUTING.md)
- [Run Novu locally](https://docs.novu.co/community/run-in-local-machine?utm_source=github&utm_medium=readme&utm_campaign=novu-locally-link)

## 🛡️ License

Novu is a commercial open source company, which means some parts of this open source repository require a commercial license. The concept is called "Open Core," where the core technology is fully open source, licensed under MIT license, and the enterprise code is covered under a commercial license ("/enterprise" Enterprise Edition). Enterprise features are built by the core engineering team of Novu which is hired in full-time.

The following modules and folders are licensed under the enterprise license:

- `enterprise` folder at the root of the project and all of their subfolders and modules
- `apps/web/src/ee` folder and all of their subfolders and modules
- `apps/dashboard/src/ee` folder and all of their subfolders and modules

## 💪 Thanks to all of our contributors

Thanks a lot for spending your time helping Novu grow. Keep rocking 🥂

<a href="https://novu.co/contributors?utm_source=github" target="_blank" rel="noopener noreferrer">
  <img src="https://contributors-img.web.app/image?repo=novuhq/novu" alt="Contributors"/>
</a>

The beatiful header animation was contributed by [LottieFiles](https://lottiefiles.com/) ❤️
