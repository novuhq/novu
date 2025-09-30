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

interface IMattermostPayload {
  channel?: string;
  text: string;
}

export class MattermostProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.Mattermost;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  private axiosInstance = axios.create();

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(data.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for Mattermost provider');
    }

    const payload: IMattermostPayload = { text: data.content };
    const { endpoint } = data.channelData;

    if (endpoint.channel) {
      payload.channel = endpoint.channel;
    }
    const response = await this.axiosInstance.post(endpoint.url, this.transform(bridgeProviderData, payload).body);

    return {
      id: response.headers['x-request-id'],
      date: response.headers.date,
    };
  }
}
