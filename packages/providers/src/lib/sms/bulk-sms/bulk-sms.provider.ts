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

export class BulkSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.BulkSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly DEFAULT_BASE_URL = 'https://api.bulksms.com/v1/messages';
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(
    private config: {
      apiToken: string;
    },
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      to: options.to,
      body: options.content,
      from: options.from || null,
    });
    const url = this.DEFAULT_BASE_URL;
    const encodedToken = Buffer.from(this.config.apiToken).toString('base64');
    const response = await axios
      .create()
      .post(url, JSON.stringify(payload.body), {
        headers: {
          Authorization: `Basic ${encodedToken}`,
          'Content-Type': 'application/json',
          ...payload.headers,
        },
      });

    return {
      id: response.data[0].id,
      date: new Date().toISOString(),
    };
  }
}
