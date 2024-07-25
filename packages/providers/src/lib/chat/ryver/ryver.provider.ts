import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class RyverChatProvider implements IChatProvider {
  public id = ChatProviderIdEnum.Ryver;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const url = new URL(options.webhookUrl);
    const response = await this.axiosInstance.post(url.toString(), {
      content: options.content,
      ...bridgeProviderData,
    });

    return {
      id: `${response.status}`,
      date: new Date().toISOString(),
    };
  }
}
