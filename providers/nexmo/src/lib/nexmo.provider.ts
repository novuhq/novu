import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import Vonage from '@vonage/server-sdk';

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
    this.vonageClient = new Vonage({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const vonageResponseId: string = await new Promise((resolve, reject) => {
      this.vonageClient.message.sendSms(
        this.config.from,
        options.to,
        options.content,
        {},
        (err, responseData) => {
          if (err) return reject(err);

          return resolve(responseData.messages[0]['message-id']);
        }
      );
    });

    return {
      id: vonageResponseId,
      date: new Date().toISOString(),
    };
  }
}
