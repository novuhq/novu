import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';

import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class AfroSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.AfroSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;
  private readonly BASE_URL = 'https://api.afromessage.com';
  private readonly ENDPOINT = '/api/send';

  constructor(
    private config: {
      apiKey?: string;
      senderName?: string;
      from?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const url = `${this.BASE_URL}${this.ENDPOINT}`;

    const queryParams = {
      from: this.config.from || options.from,
      sender: this.config.senderName,
      to: options.to,
      message: options.content,
    };

    const { data } = await axios.get(url, {
      params: this.transform(bridgeProviderData, queryParams).body,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (data.acknowledge !== 'success') {
      throw new Error(`AfroSMS error: ${data.response || 'Unknown error'}`);
    }

    return {
      id: data.response?.message_id || data.response?.id || 'unknown',
      date: new Date().toISOString(),
    };
  }
}
