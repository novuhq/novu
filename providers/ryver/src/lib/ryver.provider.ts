import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class RyverChatProvider implements IChatProvider {
  public id = 'ryver';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  async sendMessage(
    options: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    const url = new URL(options.webhookUrl);
    const response = await this.axiosInstance.post(url.toString(), {
      content: options.content,
    });

    return {
      id: `${response.status}`,
      date: new Date().toISOString(),
    };
  }
}
