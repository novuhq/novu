import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class MsTeamsProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.MsTeams;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  private axiosInstance = axios.create();

  constructor(private config) {
    super();
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(data.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for MsTeams provider');
    }

    const { endpoint } = data.channelData;
    let payload;

    try {
      payload = { ...JSON.parse(data.content) };
    } catch (err) {
      payload = { text: data.content };
    }

    payload = this.transform(bridgeProviderData, payload).body;

    const response = await this.axiosInstance.post(endpoint.url, payload);

    return {
      id: response.headers['request-id'],
      date: new Date().toISOString(),
    };
  }
}
