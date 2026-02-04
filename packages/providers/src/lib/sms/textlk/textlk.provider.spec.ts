import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

export class TextLkSmsProvider implements ISmsProvider {
  id = 'textlk';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const BASE_URL = 'https://app.text.lk/api/v3/sms/send';

    // Fix: Handle comma-separated numbers and strip leading '+'
    const recipient = options.to
      .split(',')
      .map((value) => value.trim().replace(/^\+/, ''))
      .join(',');

    const payload = {
      recipient,
      sender_id: options.from || 'Text.lk',
      type: 'plain',
      message: options.content,
    };

    const response = await axios.post(BASE_URL, payload, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    return {
      id: response.data.uid || new Date().getTime().toString(),
      date: new Date().toISOString(),
    };
  }
}
