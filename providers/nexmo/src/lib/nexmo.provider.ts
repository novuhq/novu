import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { Vonage } from '@vonage/server-sdk';
import { Auth } from '@vonage/auth';

export class NexmoSmsProvider implements ISmsProvider {
  id = 'nexmo';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private vonageClient: Vonage;

  constructor(
    private config: {
      apiKey: string;
      apiSecret: string;
      from: string;
    }
  ) {
    this.vonageClient = new Vonage(
      new Auth({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
      })
    );
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.vonageClient.sms.send({
      to: options.to,
      from: this.config.from,
      text: options.content,
    });

    return {
      id: response.messages[0]['message-id'],
      date: new Date().toISOString(),
    };
  }
}
