---
sidebar_position: 2
---

# SMS

SMS are used to send sms messages as part of your notification strategy.

## Provider interface

Each sms provider in Notifire must adhere to the following interface.

```typescript
export interface IProvider {
  id: string;
  channelType: ChannelTypeEnum;
}

export interface ISmsOptions {
  to: string;
  content: string;
  from?: string;
}

export interface ISmsProvider extends IProvider {
  sendMessage(options: ISmsOptions): Promise<any>;

  channelType: ChannelTypeEnum.SMS;
}
```

In future releases we are planning to add more methods for each provider. Including the ability to send batch messages and webhook implementations.


## Writing a provider

You can see how to write all types of providers in our [article][create-provider] dedicated just for that.

### Provider registration

After you have created your provider you must register it with the library:

```typescript
await notifire.registerProvider(
  new TwilioSmsProvider({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_FROM_NUMBER,
  })
);
```

[create-provider]: ../community/create-provider.md#sms-provider