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

export class ZulipProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.Zulip;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;

  private axiosInstance = axios.create();

  constructor(private config) {
    super();
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(data.channelData, ADDRESS_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for Zulip provider');
    }

    const { channelData } = data;

    await this.axiosInstance.post(
      channelData.address.url,
      this.transform(bridgeProviderData, {
        text: data.content,
      }).body
    );

    return {
      date: new Date().toISOString(),
    };
  }
}
