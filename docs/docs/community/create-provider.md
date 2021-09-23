---
sidebar_position: 4
---

# How to Create Provider?
All of our providers need to implement one or more of our provider interfaces, based on provider feature, from Email and SMS, 

## Email Provider

This is a code example of a basic email provider, with minimal fields required by our ``` IEmailProvider ``` interface.

 ```ts
import { ChannelTypeEnum, IEmailProvider, IEmailOptions } from "@notifire/core";

import sendgridMail from "@sendgrid/mail";

export class SendgridEmailProvider implements IEmailProvider {
  id = "sendgrid";
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    sendgridMail.setApiKey(this.config.apiKey);
  }

  async sendMessage(options: IEmailOptions): Promise<any> {
    return await sendgridMail.send({
      from: options.from || this.config.from,
      to: options.to,
      html: options.html,
      subject: options.subject,
    });
  }
}
 ```

## SMS Provider

This is a code example of a basic email provider, with minimal fields required by our ``` ISmsProvider ``` interface.

```typescript
import { ChannelTypeEnum, ISmsOptions, ISmsProvider } from "@notifire/core";

import { Twilio } from "twilio";

export class TwilioSmsProvider implements ISmsProvider {
  id = "twilio";
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  private twilioClient = new Twilio(
    this.config.accountSid,
    this.config.authToken
  );
  constructor(
    private config: {
      accountSid: string;
      authToken: string;
      from: string;
    }
  ) {}

  async sendMessage(options: ISmsOptions): Promise<any> {
    return await this.twilioClient.messages.create({
      body: options.content,
      to: options.to,
      from: this.config.from,
    });
  }
}
```