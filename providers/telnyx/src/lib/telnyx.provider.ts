import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import Telnyx from 'telnyx';
import { TelnyxConfig } from './telnyx.config';
import { ITelnyxCLient } from './telnyx.interface';

export class TelnyxSmsProvider implements ISmsProvider {
  id = 'telnyx';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private telnyxClient: ITelnyxCLient;

  constructor(private readonly config: TelnyxConfig) {
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
