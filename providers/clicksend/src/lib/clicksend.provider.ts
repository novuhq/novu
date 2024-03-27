import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

export class ClicksendSmsProvider implements ISmsProvider {
  id = 'clicksend';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      username: string;
      apiKey: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await axios.post(
      'https://rest.clicksend.com/v3/sms/send',
      {
        messages: [
          {
            to: options.to,
            body: options.content,
          },
        ],
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.config.username}:${this.config.apiKey}`
          ).toString('base64')}`,
        },
      }
    );

    return {
      id: response.data.data.messages[0].message_id,
      date: response.data.data.messages[0].date,
    };
  }
}
