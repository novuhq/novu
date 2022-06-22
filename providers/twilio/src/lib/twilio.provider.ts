import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { Twilio } from 'twilio';
import { TwilioConfig } from './twilio.config';

export class TwilioSmsProvider implements ISmsProvider {
  id = 'twilio';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private twilioClient: Twilio;

  constructor(
    private readonly config: TwilioConfig
  ) {
    this.twilioClient = new Twilio(config.accountSid, config.authToken);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const twilioResponse = await this.twilioClient.messages.create({
      body: options.content,
      to: options.to,
      from: this.config.from,
    });

    return {
      id: twilioResponse.sid,
      date: twilioResponse.dateCreated.toISOString(),
    };
  }
}
