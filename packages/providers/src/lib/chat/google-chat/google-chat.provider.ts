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

interface GoogleChatMessageResponse {
  name: string;
  createTime?: string;
}

export class GoogleChatProvider extends BaseProvider implements IChatProvider {
  protected casing = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.GoogleChat;

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(data.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for Google Chat provider');
    }

    const { endpoint } = data.channelData;
    const response = await safeChatWebhookJsonRequest<GoogleChatMessageResponse>({
      url: endpoint.url,
      body: this.transform(bridgeProviderData, {
        text: data.content,
      }).body,
    });

    const name = typeof response.body?.name === 'string' ? response.body.name : '';
    if (!name) {
      throw new Error('Google Chat webhook response did not include a message name');
    }

    const createTime = typeof response.body.createTime === 'string' ? response.body.createTime : undefined;

    return createTime ? { id: name, date: createTime } : { id: name };
  }
}
