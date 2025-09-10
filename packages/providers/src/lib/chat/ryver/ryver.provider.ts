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

export class RyverChatProvider extends BaseProvider implements IChatProvider {
  public id = ChatProviderIdEnum.Ryver;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for Ryver provider');
    }

    const { channelData } = options;
    const url = new URL(channelData.endpoint.url);
    const response = await this.axiosInstance.post(
      url.toString(),
      this.transform(bridgeProviderData, {
        content: options.content,
      }).body
    );

    return {
      id: `${response.status}`,
      date: new Date().toISOString(),
    };
  }
}
