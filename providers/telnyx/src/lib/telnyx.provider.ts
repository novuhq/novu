import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@notifire/core';

import Telnyx from 'telnyx';

import { ITelnyxCLient } from './telnyx.interface';

export class TelnyxSmsProvider implements ISmsProvider {
  id = 'telnyx';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private telnyxClient: ITelnyxCLient;

  constructor(
    private config: {
      apiKey: string;
      from: string;
      messageProfileId: string;
    }
  ) {
    this.telnyxClient = Telnyx(config.apiKey);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const telynxResponse = await this.telnyxClient.messages.create({
      to: options.to,
      text: options.content,
      from: this.config.from,
      messaging_profile_id: this.config.messageProfileId,
    });

    return {
      id: telynxResponse.data.id,
      date: telynxResponse.data.received_at.toString(),
    };
  }
}
