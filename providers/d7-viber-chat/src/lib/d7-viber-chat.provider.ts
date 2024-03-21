import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class D7ViberChatChatProvider implements IChatProvider {
  id = 'd7-viber-chat';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  private apiKey: string;
  private senderName: string;

  constructor(
    private config: {
      apiKey: string;
      senderName: string;
    }
  ) {
    this.apiKey = config.apiKey;
    this.senderName = config.senderName;
  }

  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    try {
      const messages = [
        {
          recipients: [options.webhookUrl],
          content: options.content,
          label: 'test',
        },
      ];

      const response = await axios.post(
        'https://api.d7networks.com/viber/v1/send',
        {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          data: {
            messages,
            message_globals: {
              originator: this.senderName,
              call_back_url: 'https://the_url_to_receive_delivery_report.com',
            },
          },
        }
      );

      return {
        id: response.data.id,
        date: response.data.timestamp,
      };
    } catch (error) {
      throw new Error('Failed to send Viber message');
    }
  }
}

export const apiKey = '<api_key>';
