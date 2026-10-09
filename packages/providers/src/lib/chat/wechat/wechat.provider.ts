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

export class WeChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.WeChat;
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
    if (!isChannelDataOfType(data.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for WeChat provider');
    }

    const { channelData } = data;

    const response = await this.axiosInstance.post(
      channelData.endpoint.url,
      this.transform(bridgeProviderData, {
        msgtype: 'markdown',
        markdown: {
          content: data.content,
        },
      }).body
    );

    if (response.data && response.data.errcode !== undefined && response.data.errcode !== 0) {
      throw new Error(`WeChat send failed with code ${response.data.errcode}: ${response.data.errmsg}`);
    }

    return {
      id: response.headers['x-request-id'] || new Date().getTime().toString(),
      date: new Date().toISOString(),
    };
  }
}
