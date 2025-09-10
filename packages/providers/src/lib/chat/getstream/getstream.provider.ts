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

export class GetstreamChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.GetStream;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.SNAKE_CASE;
  private axiosInstance = axios.create();

  constructor(
    private config: {
      apiKey: string;
    }
  ) {
    super();
    this.config = config;
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(data.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for Getstream provider');
    }

    const { endpoint } = data.channelData;

    const transformedData = this.transform(bridgeProviderData, {
      text: data.content,
    });
    const response = await this.axiosInstance.post(endpoint.url, {
      ...transformedData.body,
      headers: {
        'X-API-KEY': this.config.apiKey,
        ...transformedData.headers,
      },
    });

    return {
      id: response.headers['X-WEBHOOK-ID'],
      date: new Date().toISOString(),
    };
  }
}
