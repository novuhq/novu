import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class GoogleChatProvider implements IChatProvider {
  id = 'google-chat';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  constructor(private config) {}

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    // Setting the wait parameter with the URL API to respect user parameters
    const url = new URL(data.webhookUrl);
    url.searchParams.set('wait', 'true');
    const response = await this.axiosInstance.post(url.toString(), {
      text: data.content,
    });

    return {
      id: response.data.name,
      date: response.data.createTime,
    };
  }
}
