import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

export class EazySmsProvider implements ISmsProvider {
  id = SmsProviderIdEnum.EazySms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly DEFAULT_BASE_URL = 'https://api.eazy.im/v3';
  public readonly EAZY_SMS_CHANNEL = '@sms.eazy.im';
  constructor(
    private config: {
      apiKey: string;
      channelId: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = {
      ...bridgeProviderData,
      message: {
        text: options.content,
        type: 'text',
        ...((bridgeProviderData.message as object) || {}),
      },
    };

    const response = await axios.post(
      `${this.DEFAULT_BASE_URL}/channels/${this.config.channelId}/messages/${options.to}${this.EAZY_SMS_CHANNEL}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.id,
      date: new Date().toISOString(),
    };
  }
}
