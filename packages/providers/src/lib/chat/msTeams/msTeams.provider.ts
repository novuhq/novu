import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import axios from 'axios';
import { BaseProvider } from '../../../base.provider';

export class MsTeamsProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.MsTeams;
  private axiosInstance = axios.create();

  constructor(private config) {
    super();
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    let payload;

    try {
      payload = { ...JSON.parse(data.content) };
    } catch (err) {
      payload = { text: data.content };
    }

    payload = this.transform(bridgeProviderData, payload).body;

    const response = await this.axiosInstance.post(data.webhookUrl, payload);

    return {
      id: response.headers['request-id'],
      date: new Date().toISOString(),
    };
  }
}
