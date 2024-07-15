import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

export class BulkSmsProvider implements ISmsProvider {
  id = SmsProviderIdEnum.BulkSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly DEFAULT_BASE_URL = 'https://api.bulksms.com/v1/messages';

  constructor(
    private config: {
      apiToken: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = {
      to: options.to,
      body: options.content,
      from: options.from || null,
      ...bridgeProviderData,
    };
    const url = this.DEFAULT_BASE_URL;
    const encodedToken = Buffer.from(this.config.apiToken).toString('base64');
    const response = await axios.post(url, JSON.stringify(payload), {
      headers: {
        Authorization: `Basic ${encodedToken}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      id: response.data[0].id,
      date: new Date().toISOString(),
    };
  }
}
