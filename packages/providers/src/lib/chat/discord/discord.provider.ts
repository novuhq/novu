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
import { resolveSafeChatWebhookUrl, safeChatWebhookJsonRequest } from '../../../utils/safe-chat-webhook-request';
import { WithPassthrough } from '../../../utils/types';

export class DiscordProvider extends BaseProvider implements IChatProvider {
  protected casing = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.Discord;

  constructor(private config) {
    super();
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    // Setting the wait parameter with the URL API to respect user parameters
    if (!isChannelDataOfType(data.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for Discord provider');
    }

    const { endpoint } = data.channelData;

    const url = new URL(resolveSafeChatWebhookUrl(endpoint.url));
    url.searchParams.set('wait', 'true');

    const response = await safeChatWebhookJsonRequest<{ id: string; timestamp: string }>({
      url: url.toString(),
      body: this.transform(bridgeProviderData, {
        content: data.content,
        ...(data.customData || {}),
      }).body,
    });

    return {
      id: response.body.id,
      date: response.body.timestamp,
    };
  }
}
