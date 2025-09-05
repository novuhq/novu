import { ChatProviderIdEnum } from '@novu/shared';
import {
  ADDRESS_TYPES,
  ChannelTypeEnum,
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
    if (!isChannelDataOfType(data.channelData, ADDRESS_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for Mattermost provider');
    }

    const payload: IMattermostPayload = { text: data.content };
    const { address } = data.channelData;

    if (address.channel) {
      payload.channel = address.channel;
    }
    const response = await this.axiosInstance.post(address.url, this.transform(bridgeProviderData, payload).body);

    return {
      id: response.headers['x-request-id'],
      date: response.headers.date,
    };
  }
}
