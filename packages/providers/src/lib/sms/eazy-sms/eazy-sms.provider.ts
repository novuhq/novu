import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';
import { BaseProvider } from '../../../base.provider';

export class EazySmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.EazySms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly DEFAULT_BASE_URL = 'https://api.eazy.im/v3';
  public readonly EAZY_SMS_CHANNEL = '@sms.eazy.im';
  constructor(
    private config: {
      apiKey: string;
      channelId: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      message: {
        text: options.content,
        type: 'text',
      },
    });

    const response = await axios.post(
      `${this.DEFAULT_BASE_URL}/channels/${this.config.channelId}/messages/${options.to}${this.EAZY_SMS_CHANNEL}`,
      payload.body,
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...payload.headers,
        },
      }
    );

    return {
      id: response.data.id,
      date: new Date().toISOString(),
    };
  }
}
