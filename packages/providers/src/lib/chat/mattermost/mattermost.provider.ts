import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { safeChatWebhookJsonRequest } from '../../../utils/safe-chat-webhook-request';
import { WithPassthrough } from '../../../utils/types';

interface IMattermostPayload {
  channel?: string;
  text: string;
}

export class MattermostProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.Mattermost;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;

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
    const response = await safeChatWebhookJsonRequest({
      url: endpoint.url,
      body: this.transform(bridgeProviderData, payload).body,
    });

    return {
      id: response.headers['x-request-id'] as string,
      date: response.headers.date as string,
    };
  }
}
