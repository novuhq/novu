import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import { v4 as uuid } from 'uuid';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { resolveSafeChatWebhookUrl, safeChatWebhookJsonRequest } from '../../../utils/safe-chat-webhook-request';
import { WithPassthrough } from '../../../utils/types';

export class GrafanaOnCallChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.GrafanaOnCall;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(
    private config: {
      alertUid?: string;
      title?: string;
      imageUrl?: string;
      state?: string;
      externalLink?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for GrafanaOnCall provider');
    }

    const { endpoint } = options.channelData;

    const url = new URL(resolveSafeChatWebhookUrl(endpoint.url));
    const data = this.transform(bridgeProviderData, {
      alert_uid: this.config.alertUid,
      title: this.config.title,
      image_url: this.config.imageUrl,
      state: this.config.state,
      link_to_upstream_details: this.config.externalLink,
      message: options.content,
    });

    const hasHeaders = data.headers && Object.keys(data.headers).length > 0;

    const response = await safeChatWebhookJsonRequest({
      url: url.toString(),
      body: data.body,
      headers: hasHeaders ? (data.headers as Record<string, string>) : undefined,
    });

    return {
      id: uuid(),
      date: (response.headers.date ? new Date(response.headers.date as string) : new Date()).toISOString(),
    };
  }
}
