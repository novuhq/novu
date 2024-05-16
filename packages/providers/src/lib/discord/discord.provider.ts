import {
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import axios from 'axios';

export class DiscordProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = 'discord';
  private axiosInstance = axios.create();

  constructor(private config) {}

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    // Setting the wait parameter with the URL API to respect user parameters
    const url = new URL(data.webhookUrl);
    url.searchParams.set('wait', 'true');
    const response = await this.axiosInstance.post(url.toString(), {
      content: data.content,
    });

    return {
      id: response.data.id,
      date: response.data.timestamp,
    };
  }
}
