import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

export class SmsToViberSmsProvider implements ISmsProvider {
  id = 'sms-to-viber';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly URL = 'https://api.sms.to/viber/send';
  constructor(
    private config: {
      apiKey: string;
      from?: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const params = {
      api_key: this.config.apiKey,
      to: options.to,
      message: options.content,
    };

    const response = await axios.get(this.URL, { params });

    return {
      id: response.data.message_id,
      date: new Date().toISOString(),
    };
  }
}
