import axios from 'axios';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from '@novu/stateless';
import { ChatProviderIdEnum } from '@novu/shared';
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
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const payload: IMattermostPayload = { text: data.content };

    if (data.channel) {
      payload.channel = data.channel;
    }
    const response = await this.axiosInstance.post(
      data.webhookUrl,
      this.transform(bridgeProviderData, payload).body,
    );

    return {
      id: response.headers['x-request-id'],
      date: response.headers.date,
    };
  }
}
