import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

export class EazySmsProvider implements ISmsProvider {
  id = 'eazy-sms';
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
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const payload = {
      message: {
        text: options.content,
        type: 'text',
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
