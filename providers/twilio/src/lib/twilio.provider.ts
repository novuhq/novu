import { ChannelTypeEnum, ISmsOptions, ISmsProvider } from '@notifire/core';

import { Twilio } from 'twilio';

export class TwilioSmsProvider implements ISmsProvider {
  id = 'twilio';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private twilioClient: Twilio;

  constructor(
    private config: {
      accountSid: string;
      authToken: string;
      from: string;
    }
  ) {
    this.twilioClient = new Twilio(config.accountSid, config.authToken);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendMessage(options: ISmsOptions): Promise<any> {
    return await this.twilioClient.messages.create({
      body: options.content,
      to: options.to,
      from: this.config.from,
    });
  }
}
