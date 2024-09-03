import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class SimpletextingSmsProvider
  extends BaseProvider
  implements ISmsProvider
{
  id = SmsProviderIdEnum.Simpletexting;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(
    private config: {
      apiKey: string;
      accountPhone: string;
    },
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      contactPhone: options.to,
      accountPhone: this.config.accountPhone,
      mode: 'SINGLE_SMS_STRICTLY',
      text: options.content,
    });
    const response = await axios
      .create()
      .post('https://api-app2.simpletexting.com/v2/api/messages', data.body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          ...data.headers,
        },
      });

    return {
      id: response.data.id,
      date: new Date().toISOString(),
    };
  }
}
