import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class GetstreamChatProvider implements IChatProvider {
  id = 'getstream';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  constructor(
    private config: {
      apiKey: string;
    }
  ) {
    this.config = config;
  }

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    const response = await this.axiosInstance.post(data.webhookUrl, {
      text: data.content,
      headers: {
        'X-API-KEY': this.config.apiKey,
      },
    });

    return {
      id: response.headers['X-WEBHOOK-ID'],
      date: new Date().toISOString(),
    };
  }
}
