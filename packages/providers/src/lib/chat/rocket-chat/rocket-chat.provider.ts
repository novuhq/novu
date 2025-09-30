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

export class RocketChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.RocketChat;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  private axiosInstance = axios.create();

  constructor(
    private config: {
      token: string;
      user: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { channelData } = options;

    if (!isChannelDataOfType(channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for RocketChat provider');
    }

    const roomId = channelData.endpoint.channel;

    const payload = {
      message: {
        rid: roomId,
        msg: options.content,
      },
    };
    const transformedData = this.transform(bridgeProviderData, payload);
    const headers = {
      'x-auth-token': this.config.token,
      'x-user-id': this.config.user,
      'Content-Type': 'application/json',
      ...transformedData.headers,
    };
    const baseURL = `${channelData.endpoint.url.toString()}/api/v1/chat.sendMessage`;
    const { data } = await this.axiosInstance.post(baseURL, transformedData.body, {
      headers,
    });

    return {
      id: data.message._id,
      date: data.message.ts,
    };
  }
}
