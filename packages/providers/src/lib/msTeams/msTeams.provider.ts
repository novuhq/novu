import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';

export class MsTeamsProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.MsTeams;
  private axiosInstance = axios.create();

  constructor(private config) {}

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    let payload;

    try {
      payload = { ...JSON.parse(data.content), ...bridgeProviderData };
    } catch (err) {
      payload = { text: data.content, ...bridgeProviderData };
    }

    const response = await this.axiosInstance.post(data.webhookUrl, payload);

    return {
      id: response.headers['request-id'],
      date: new Date().toISOString(),
    };
  }
}
