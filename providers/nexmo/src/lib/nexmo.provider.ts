import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { Vonage, Auth } from '@vonage/server-sdk';

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
      from: this.config.from,
      to: options.to,
      text: options.content,
    });

    return {
      id: response.messages[0]?.messageId,
      date: new Date().toISOString(),
    };
  }
}
