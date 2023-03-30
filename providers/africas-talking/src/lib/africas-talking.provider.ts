// eslint-disable @cspell/spellchecker
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import AfricasTalking from 'africastalking';
import type {
  IAfricasTalkingClient,
  IAfricasTalkingClientOptions,
} from 'africastalking';

export class AfricasTalkingSmsProvider implements ISmsProvider {
  id = 'africastalking';

  private shortCode: string;

  private africasTalkingClient: IAfricasTalkingClient;

  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(config: IAfricasTalkingClientOptions) {
    this.shortCode = config.from;

    this.africasTalkingClient = AfricasTalking({
      apiKey: config.apiKey,
      username: config.username,
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.africasTalkingClient.SMS.send({
      to: options.to,
      from: this.shortCode || options?.from,
      message: options.content,
    });

    return {
      id: response?.SMSMessageData?.Recipients[0]?.messageId,
      date: new Date().toISOString(),
    };
  }
}
