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
import { v4 as uuid } from 'uuid';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class GrafanaOnCallChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.GrafanaOnCall;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.SNAKE_CASE;
  private axiosInstance = axios.create();
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

    const url = new URL(endpoint.url);
    const data = this.transform(bridgeProviderData, {
      alert_uid: this.config.alertUid,
      title: this.config.title,
      image_url: this.config.imageUrl,
      state: this.config.state,
      link_to_upstream_details: this.config.externalLink,
      message: options.content,
    });

    const hasHeaders = data.headers && Object.keys(data.headers).length > 0;

    // response is just string "Ok."
    const { headers } = await this.axiosInstance.post(
      url.toString(),
      data.body,
      hasHeaders
        ? {
            headers: data.headers as Record<string, string>,
          }
        : undefined
    );

    return {
      id: uuid(),
      date: (headers.Date ? new Date(headers.Date) : new Date()).toISOString(),
    };
  }
}
