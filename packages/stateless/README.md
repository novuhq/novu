## 📦 Install

```bash
npm install @novu/stateless
```

```bash
yarn add @novu/stateless
```

## 🔨 Usage

```ts
import { NovuStateless, ChannelTypeEnum } from '@novu/stateless';
import { SendgridEmailProvider } from '@novu/providers';

const novu = new NovuStateless();

await novu.registerProvider(
  new SendgridEmailProvider({
    apiKey: process.env.SENDGRID_API_KEY,
    from: 'sender@mail.com',
  }),
);

const passwordResetTemplate = await novu.registerTemplate({
  id: 'password-reset',
  messages: [
    {
      subject: 'Your password reset request',
      channel: ChannelTypeEnum.EMAIL,
      template: `
          Hi {{firstName}}!

          To reset your password click <a href="{{resetLink}}">here.</a>

          {{#if organization}}
            <img src="{{organization.logo}}" />
          {{/if}}
      `,
    },
  ],
});

await novu.trigger('<REPLACE_WITH_EVENT_NAME>', {
  $user_id: '<USER IDENTIFIER>',
  $email: 'test@email.com',
  firstName: 'John',
  lastName: 'Doe',
  organization: {
    logo: 'https://evilcorp.com/logo.png',
  },
});
```

## Providers

Novu provides a single API to manage providers across multiple channels with a simple-to-use interface.

#### 💌 Email

- [x] [Sendgrid](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/sendgrid)
- [x] [Netcore](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/netcore)
- [x] [Mailgun](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mailgun)
- [x] [SES](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/ses)
- [x] [Postmark](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/postmark)
- [x] [Custom SMTP](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/nodemailer)
- [x] [Mailjet](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mailjet)
- [x] [Mandrill](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/mandrill)
- [x] [SendinBlue](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/email/brevo)
- [ ] SparkPost

#### 📞 SMS

- [x] [Twilio](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/twilio)
- [x] [Plivo](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/plivo)
- [x] [SNS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sns)
- [x] [Nexmo - Vonage](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/nexmo)
- [x] [Sms77](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sms77)
- [x] [Telnyx](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/telnyx)
- [x] [Termii](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/termii)
- [x] [Gupshup](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/gupshup)
- [ ] Bandwidth
- [ ] RingCentral

#### 📱 Push

- [x] [FCM](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/fcm)
- [x] [Expo](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/push/expo)
- [ ] [SNS](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/sms/sns)
- [ ] Pushwoosh

#### 👇 Chat

- [x] [Slack](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/slack)
- [x] [Discord](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib/chat/discord)
- [ ] MS Teams
- [ ] Mattermost

#### 📱 In-App

- [x] [Novu](https://docs.novu.co/notification-center/introduction?utm_source=github-stateless-readme)

#### Other (Coming Soon...)

- [ ] PagerDuty

## 🔗 Links

- [Home page](https://novu.co/)
