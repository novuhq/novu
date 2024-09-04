import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import Sms77Client, { SmsJsonResponse, SmsParams } from 'sms77-client';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class Sms77SmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Sms77;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;
  private sms77Client: Sms77Client;

  constructor(
    private config: {
      apiKey?: string;
      from?: string;
    },
  ) {
    super();
    this.sms77Client = new Sms77Client(config.apiKey, 'Novu');
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const params: SmsParams = this.transform<SmsParams>(bridgeProviderData, {
      from: options.from || this.config.from,
      json: true,
      text: options.content,
      to: options.to,
    }).body;

    const sms77Response = <SmsJsonResponse>await this.sms77Client.sms(params);

    return {
      id: sms77Response.messages[0].id,
      date: new Date().toISOString(),
    };
  }
}
