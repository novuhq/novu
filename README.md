<p align="center">
  <a href="https://notifire.co">
    <img width="200" src="https://notifire.co/img/logo.png">
  </a>
</p>

<h1 align="center">Notification management library</h1>

<div align="center">

The ultimate library for managing transactional notifications for node

</div>

## ✨ Features

- 🌈 Single API for all messaging providers
- 🌈 Easily manage notification and channels 
- 📦 Easy to setup and integrate
- 🛡 Written in TypeScript with predictable static types.

## 📦 Install

```bash
npm install @notifire/lib
```

```bash
yarn add @notifire/lib
```

## 🔨 Usage

```ts
import { Notifire, ChannelTypeEnum } from '@notifire/lib';
import { SendgridProvider } from '@notifire/sendgrid-provider';

const notifire = new Notifire();

await notifire.registerProvider(
  new SendgridProvider({
    apiKey: process.env.SENDGRID_API_KEY
  })
);

const passwordResetTemplate = await notifire.registerTemplate({
  id: 'password-reset',
  messages: [
    {
      subject: 'Your password reset request',
      channel: ChannelTypeEnum.EMAIL,
      template: `
          Hi {{firstName}}!
          
          To reset your password click <a href="{{resetLink}}">here.</a>
          
          {{#if organization}}
            <img src="organization.logo" />
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
  organization: {
    logo: 'https://evilcorp.com/logo.png'
  }
});
```

### TypeScript

`@notifire/lib` is written in TypeScript with complete definitions.

## 🔗 Links
- [Home page](https://notifire.co/)
