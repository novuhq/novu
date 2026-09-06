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

Using the Novu API and admin panel, you can easily add a real-time notification center to your web app without building it yourself. You can use our [React](https://docs.novu.co/platform/quickstart/react?utm_source=github&utm_medium=readme&utm_campaign=react-starter-link), or build your own via our API and SDK. React native, Vue, and Angular are coming soon.

<div align="center">
<img width="4800" height="2700" alt="Novu's Embeddable Inbox components" src="https://github.com/user-attachments/assets/00224c75-7ed0-4e19-b6fd-2a0bdced6258" />

Read more about how to add a [notification center Inbox](https://docs.novu.co/platform/quickstart/react?utm_source=github&utm_medium=readme&utm_campaign=read-more-react-link) to your app.

</div>

## Providers

Novu provides a single API to manage providers across multiple channels with a simple-to-use API and UI interface.

Expand a channel below to browse supported providers.

<details>
<summary><strong>💌 Email</strong> (20 providers)</summary>

| Provider |
| --- |
| [Amazon SES](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/ses) |
| [Anypost](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/anypost) |
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
<summary><strong>💬 Chat</strong> (13 providers)</summary>

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
| [Webex Messaging](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/webex-messaging) |
| [WhatsApp Business](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/whatsapp-business) |
| [Zulip](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/zulip) |

</details>

<details>
<summary><strong>📥 In-App</strong> (1 provider)</summary>

| Provider |
| --- |
| [Novu Inbox](https://docs.novu.co/platform/quickstart/react?utm_source=github&utm_medium=repository&utm_campaign=inbox-channel-link) |

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

- `enterprise` folder at the root of the project and all of its subfolders and modules

## 💪 Thanks to all of our contributors

Thanks a lot for spending your time helping Novu grow. Keep rocking 🥂

<a href="https://novu.co/contributors?utm_source=github" target="_blank" rel="noopener noreferrer">
  <img src="https://contributors-img.web.app/image?repo=novuhq/novu" alt="Contributors"/>
</a>

The beatiful header animation was contributed by [LottieFiles](https://lottiefiles.com/) ❤️


## 🌐 Web Resources & Interactive Index
- [BRILLIANT JEWELS](https://learnquester.pages.dev/brilliant-jewels.html)
- [CATEGORY FPS](https://studyplaying.github.io/category-fps.html)
- [SORTSTORE](https://studyquesthub.web.app/sortstore.html)
- [HEXAMATCH](https://studyplayings.pages.dev/hexamatch.html)
- [CATEGORY SECURLY BYPASS](https://studyquests.github.io/category-securly-bypass.html)
- [PIXEL SHOOT](https://studyplaying.github.io/pixel-shoot.html)
- [MAHJONG EARTH](https://studyplaying.github.io/mahjong-earth.html)
- [SPRUNKI 3D SHOOTER](https://quizverses.pages.dev/sprunki-3d-shooter.html)
- [STACKTRIS 2048](https://quizverses.pages.dev/stacktris-2048.html)
- [FASHION CHALLENGE CATWALK RUN](https://quizverses.pages.dev/fashion-challenge-catwalk-run.html)
- [PUSH THE FROG](https://studyquesthub.web.app/push-the-frog.html)
- [DISASSEMBLE THE PICTURE PUZZLE](https://studyplaying.github.io/disassemble-the-picture-puzzle.html)
- [TRUCK STACK COLORS](https://studyplaying.github.io/truck-stack-colors.html)
- [ELLIE AND FRIENDS VENICE CARNIVAL](https://quizverses-9d2f2.web.app/ellie-and-friends-venice-carnival.html)
- [CATEGORY CASUAL 2](https://studyplaying.github.io/category-casual-2.html)
- [TRIANGLE WAY](https://quizverses.pages.dev/triangle-way.html)
- [INDEX33](https://studyquests.github.io/index33.html)
- [CATEGORY MOUSE](https://studyquests.pages.dev/category-mouse.html)
- [CATEGORY BASKETBALL 2](https://studyquests.github.io/category-basketball-2.html)
- [CATEGORY LOGIC538](https://studyplaying.github.io/category-logic538.html)
- [CONSTRUCTION SET 3D BUILDER](https://studyplaying.github.io/construction-set-3d-builder.html)
- [SWIPETOWN](https://quizverses.github.io/swipetown.html)
- [TAP ARROW AWAY](https://quizverses.pages.dev/tap-arrow-away.html)
- [HALLOWEEN STICKMAN](https://studyplaying.github.io/halloween-stickman.html)
- [SHEEP SHEEP DUCK](https://quizverses-9d2f2.web.app/sheep-sheep-duck.html)
- [OBBY CARDS THE LEGEND HUNT](https://studyplaying.github.io/obby-cards-the-legend-hunt.html)
- [SQUID GAME HUNTER](https://quizverses.pages.dev/squid-game-hunter.html)
- [I AM MONKEY](https://studyplaying.github.io/i-am-monkey.html)
- [CATEGORY BLOCK91](https://studyplayings.web.app/category-block91.html)
- [CATEGORY SURVIVAL365](https://studyplaying.github.io/category-survival365.html)
- [HOLE DIGGER](https://studyquests.pages.dev/hole-digger.html)
- [PULL THE PINS](https://quizverses.pages.dev/pull-the-pins.html)
- [IDLE DICE 3D INCREMENTAL GAME](https://quizverses.github.io/idle-dice-3d-incremental-game.html)
- [STACK N SORT](https://studyplaying.github.io/stack-n-sort.html)
- [EAT BLOBS SIMULATOR](https://quizverses.pages.dev/eat-blobs-simulator.html)
- [GALAXY CARNAGE](https://studyquests.github.io/galaxy-carnage.html)
- [NOOB JAILBREAK 2](https://studyquesthub.web.app/noob-jailbreak-2.html)
- [MAHJONG RIDDLES EGYPT](https://studyplaying.github.io/mahjong-riddles-egypt.html)
- [PAINT RACE](https://quizverses.github.io/paint-race.html)
- [MOW IT](https://studyquests.github.io/mow-it.html)
- [PEG SOLITAIRE](https://quizverses.github.io/peg-solitaire.html)
- [MY PARKING LOT](https://studyquests.github.io/my-parking-lot.html)
- [PRSINO](https://studyplaying.github.io/prsino.html)
- [BLACKRIVER MYSTERY HIDDEN OBJECTS](https://studyplaying.github.io/blackriver-mystery-hidden-objects.html)
- [SOCCER DUEL](https://quizverses.pages.dev/soccer-duel.html)
- [VENETIAN LOVE AFFAIR](https://studyquests.github.io/venetian-love-affair.html)
- [MR LONG HAND](https://quizverses-9d2f2.web.app/mr-long-hand.html)
- [SWIPETOWN](https://studyquests.pages.dev/swipetown.html)
- [WAVE ROAD 3D](https://studyquesthub.web.app/wave-road-3d.html)
- [2048 DROP MERGE](https://quizverses.github.io/2048-drop-merge.html)
- [BUBBLE SHOOTER NEON](https://studyquesthub.web.app/bubble-shooter-neon.html)
- [POTION SORT](https://quizverses.pages.dev/potion-sort.html)
- [TIC TAC TOE MERGE](https://quizverses.github.io/tic-tac-toe-merge.html)
- [ANOMALY CONTENT RECORD](https://quizverses.pages.dev/anomaly-content-record.html)
- [DOWNTOWN PARKOUR DRIVE](https://studyquests.pages.dev/downtown-parkour-drive.html)
- [CATEGORY HORROR90](https://studyplaying.github.io/category-horror90.html)
- [INDEX7](https://studyquests.pages.dev/index7.html)
- [UNICYCLE BALANCE 3D](https://quizverses.github.io/unicycle-balance-3d.html)
- [LABUBU MERGE CLICKER](https://quizverses-9d2f2.web.app/labubu-merge-clicker.html)
- [FLICK SHOT SOCCER](https://studyplaying.github.io/flick-shot-soccer.html)
- [HIDDEN OBJECTS VACATION IN BRAZIL](https://quizverses-9d2f2.web.app/hidden-objects-vacation-in-brazil.html)
- [SPRUNKI MONSTER MUSIC BEATS](https://studyplaying.github.io/sprunki-monster-music-beats.html)
- [GRANNY PILLS DEFEND CACTUSES](https://studyplaying.github.io/granny-pills-defend-cactuses.html)
- [MERGE MUSCLE](https://studyquests.github.io/merge-muscle.html)
- [CATEGORY MAKEUP51](https://studyplaying.github.io/category-makeup51.html)
- [ROPE RESCUE UNIQUE PUZZLE](https://studyplaying.github.io/rope-rescue-unique-puzzle.html)
- [MOTO CABBIE SIMULATOR](https://studyquests.github.io/moto-cabbie-simulator.html)
- [STACK N SORT](https://quizverses.github.io/stack-n-sort.html)
- [CATEGORY BATTLE524](https://studyquests.pages.dev/category-battle524.html)
- [SOLITAIRE MATCH](https://quizverses.github.io/solitaire-match.html)
- [PUZZLE BLOCKS CLASSIC](https://studyquests.pages.dev/puzzle-blocks-classic.html)
- [SPRUNKI BEATS](https://studyquests.pages.dev/sprunki-beats.html)
- [HEROBALL ADVENTURES 2](https://studyquests.pages.dev/heroball-adventures-2.html)
- [CATEGORY HORROR 2](https://studyplaying.github.io/category-horror-2.html)
- [SUSHI PUZZLE](https://studyplaying.github.io/sushi-puzzle.html)
- [CATEGORY BATTLE GAMES](https://studyquests.pages.dev/category-battle-games.html)
- [CATEGORY PROXIES](https://studyquests.github.io/category-proxies.html)
- [CATEGORY STRATEGY 2](https://studyplaying.github.io/category-strategy-2.html)
- [CATEGORY MERGE224](https://studyplaying.github.io/category-merge224.html)
- [CATEGORY JIGSAW](https://quizverses.github.io/category-jigsaw.html)
- [FAMILY TREE EMOJI](https://studyquesthub.web.app/family-tree-emoji.html)
- [I8 CITY DRIVER](https://studyquests.pages.dev/i8-city-driver.html)
- [SQUIRREL WITH A GUN](https://studyquesthub.web.app/squirrel-with-a-gun.html)
- [OCEAN POP](https://studyplaying.github.io/ocean-pop.html)
- [ZINDEX](https://quizverses-9d2f2.web.app/zindex.html)
- [CATCH THE GOOSE](https://studyquesthub.web.app/catch-the-goose.html)
- [KEY QUEST](https://quizverses.github.io/key-quest.html)
- [CATEGORY IDLE445](https://studyplaying.github.io/category-idle445.html)
- [ARTILLERY VS TANKS](https://quizverses.github.io/artillery-vs-tanks.html)
- [TARCAT](https://studyplaying.github.io/tarcat.html)
- [INCOWORD](https://quizverses.github.io/incoword.html)
- [DARK MYTH MONKEY MERGE](https://quizverses.github.io/dark-myth-monkey-merge.html)
- [KINGDOM OF PIXELS](https://studyquesthub.web.app/kingdom-of-pixels.html)
- [COMBINE PICKAXES](https://studyquests.pages.dev/combine-pickaxes.html)
- [AIR STRIKE 2D](https://quizverses.github.io/air-strike-2d.html)
- [BOMB EVOLUTION](https://quizverses.github.io/bomb-evolution.html)
- [CATEGORY BATTLESHIP19](https://studyquests.pages.dev/category-battleship19.html)
- [ADVERSATOR](https://quizverses.github.io/adversator.html)
- [MURDER CASE CLUE 3D](https://quizverses.github.io/murder-case-clue-3d.html)
- [STAND ON THE RIGHT COLOR ROBBY](https://studyquesthub.web.app/stand-on-the-right-color-robby.html)
- [MERGE GALAXY](https://studyplaying.github.io/merge-galaxy.html)
- [CATEGORY IDLE448](https://quizverses.pages.dev/category-idle448.html)
- [SOKOBAN PR](https://studyquests.github.io/sokoban-pr.html)
- [FAMILY SQUID CHALLENGE](https://quizverses.github.io/family-squid-challenge.html)
- [CATEGORY THINKY 2](https://quizverses.github.io/category-thinky-2.html)
- [CATEGORY CASUAL 2](https://studyquests.pages.dev/category-casual-2.html)
- [STRAWBERRY HERO](https://quizverses.pages.dev/strawberry-hero.html)
- [ZOMBIE OUTBREAK SURVIVE](https://studyquesthub.web.app/zombie-outbreak-survive.html)
- [OFFLINE FPS ROYALE](https://quizverses-9d2f2.web.app/offline-fps-royale.html)
- [SANTA GO](https://quizverses.github.io/santa-go.html)
- [MONSTER SLAYERS](https://studyplaying.github.io/monster-slayers.html)
- [CATEGORY MATCH 3](https://studyplaying.github.io/category-match-3.html)
- [FOONO ONLINE MULTIPLAYER CARD GAME](https://studyplaying.github.io/foono-online-multiplayer-card-game.html)
- [TOSS THE RING](https://studyplaying.github.io/toss-the-ring.html)
- [KNEE CASE SIMULATOR](https://studyquesthub.web.app/knee-case-simulator.html)
- [PLANETARIUM 2](https://studyplaying.github.io/planetarium-2.html)
- [NINJA SURVIVOR](https://studyquests.pages.dev/ninja-survivor.html)
- [CATEGORY SHOOTER 2](https://studyplaying.github.io/category-shooter-2.html)
- [SCHOOL TEACHER SIMULATOR](https://studyplaying.github.io/school-teacher-simulator.html)
- [OLE BUNNY](https://studyquests.pages.dev/ole-bunny.html)
- [COINS](https://studyquests.pages.dev/coins.html)
- [DELICIOUS EMILYS NEW BEGINNING VALENTINES EDITION](https://quizverses.github.io/delicious-emilys-new-beginning-valentines-edition.html)
- [PIZZA PUZZLE](https://studyquesthub.web.app/pizza-puzzle.html)
- [CHAOS ROAD COMBAT CAR RACING](https://quizverses-9d2f2.web.app/chaos-road-combat-car-racing.html)
- [XMAS HEXA SORT](https://studyquests.pages.dev/xmas-hexa-sort.html)
- [TAP GO DELUXE](https://quizverses.github.io/tap-go-deluxe.html)
- [MATCHING PUZZLE](https://studyplaying.github.io/matching-puzzle.html)
- [CATEGORY JIGSAW](https://studyplaying.github.io/category-jigsaw.html)
- [NEIGHBORHOOD DEFENSE](https://studyquests.github.io/neighborhood-defense.html)
- [CRAZY TUNNEL](https://studyquests.github.io/crazy-tunnel.html)
