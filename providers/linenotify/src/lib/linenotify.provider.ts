import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class LinenotifyProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = 'linenotify';
  private axiosInstance = axios.create();

  constructor(
    private config: {
      authToken: string;
    }
  ) {}

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    const url = new URL(data.webhookUrl);
    const response = await this.axiosInstance.post(
      url.toString(),
      {
        message: data.content, // Limit 1000 characters
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.authToken}`,
        },
      }
    );

    return {
      id: response.data.message,
      date: response.data.timestamp,
    };
  }
}
