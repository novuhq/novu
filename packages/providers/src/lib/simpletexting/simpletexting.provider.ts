import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import axios from 'axios';
export class SimpletextingSmsProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Simpletexting;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      apiKey: string;
      accountPhone: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const response = await axios.post(
      'https://api-app2.simpletexting.com/v2/api/messages',
      {
        contactPhone: options.to,
        accountPhone: this.config.accountPhone,
        mode: 'SINGLE_SMS_STRICTLY',
        text: options.content,
        ...bridgeProviderData,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      }
    );

    return {
      id: response.data.id,
      date: new Date().toISOString(),
    };
  }
}
