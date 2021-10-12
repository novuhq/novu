---
sidebar_position: 2
---

# E-mail

E-mail providers are used to send e-mail messages as part of your notification strategy. It is usually the first step in the transactional notification realm.

## Provider interface

Each e-mail provider in Notifire must adhere to the following interface.

```typescript
export interface IProvider {
  id: string;
  channelType: ChannelTypeEnum;
}

export interface IEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  text?: string;
}

export interface IEmailProvider extends IProvider {
  channelType: ChannelTypeEnum.EMAIL;

  sendMessage(options: IEmailOptions): Promise<any>;
}
```

In future releases we are planning to add more methods for each provider. Including the ability to send batch messages and webhook implementations.

## Writing a provider

You can see how to write all types of providers in our [article][create-provider] dedicated just for that.

### Provider registration

After you have created your provider you must register it with the library:

```typescript
await notifire.registerProvider(
  new SendgridEmailProvider({
    apiKey: process.env.SENDGRID_API_KEY,
    from: "support@supercorp.io",
  })
);
```

[create-provider]: ../community/create-provider.md#email-provider