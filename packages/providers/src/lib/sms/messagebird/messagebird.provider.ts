import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { Message } from 'messagebird/types/messages';
import { initClient } from 'messagebird';
import { SmsProviderIdEnum } from '@novu/shared';

export class MessageBirdSmsProvider implements ISmsProvider {
  id = SmsProviderIdEnum.MessageBird;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private messageBirdClient: ReturnType<typeof initClient>;
  constructor(
    private config: {
      access_key?: string;
    }
  ) {
    this.messageBirdClient = initClient(config.access_key);
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const params = {
      originator: options.from,
      recipients: [options.to],
      body: options.content,
      ...bridgeProviderData,
    };

    const response = await new Promise<Message>((resolve, reject) => {
      this.messageBirdClient.messages.create(params, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });

    return {
      id: response.id,
      date: response.createdDatetime,
    };
  }
}
