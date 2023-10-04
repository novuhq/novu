import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class TelegramProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = 'telegram';
  private axiosInstance = axios.create();

  constructor(
    private config: {
      botToken?: string;
    }
  ) {}
  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    const botToken = options.botToken || this.config.botToken;
    const botUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const url = new URL(botUrl);
    url.searchParams.set('chat_id', options.chatUserId);
    url.searchParams.set('text', options.content);
    const response = await this.axiosInstance.post(url.toString(), {
      content: options.content,
    });

    return {
      id: response.data.message_id,
      date: response.data.date,
    };
  }
}
