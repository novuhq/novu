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

export class GetstreamChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.GetStream;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.SNAKE_CASE;

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
    // GetStream expects auth metadata inside the JSON payload, not as HTTP headers.
    const response = await safeChatWebhookJsonRequest({
      url: endpoint.url,
      body: {
        ...transformedData.body,
        headers: {
          'X-API-KEY': this.config.apiKey,
          ...transformedData.headers,
        },
      },
    });

    return {
      id: response.headers['x-webhook-id'] as string,
      date: new Date().toISOString(),
    };
  }
}
