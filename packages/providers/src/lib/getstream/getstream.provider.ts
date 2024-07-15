import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class GetstreamChatProvider implements IChatProvider {
  id = ChatProviderIdEnum.GetStream;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  constructor(
    private config: {
      apiKey: string;
    }
  ) {
    this.config = config;
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.axiosInstance.post(data.webhookUrl, {
      text: data.content,
      ...bridgeProviderData,
      headers: {
        'X-API-KEY': this.config.apiKey,
        ...((bridgeProviderData.headers as object) || {}),
      },
    });

    return {
      id: response.headers['X-WEBHOOK-ID'],
      date: new Date().toISOString(),
    };
  }
}
