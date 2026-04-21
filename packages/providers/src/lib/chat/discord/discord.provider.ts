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

export class DiscordProvider extends BaseProvider implements IChatProvider {
  protected casing = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.Discord;
  private axiosInstance = axios.create();

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

    const url = new URL(endpoint.url);

    url.searchParams.set('wait', 'true');
    const response = await this.axiosInstance.post(
      url.toString(),
      this.transform(bridgeProviderData, {
        content: data.content,
        /**
         * Discord supports up to 10 embeds per webhook message. When we have
         * compiled embeds from a `CardElement`, forward them; Discord renders
         * the card as one or more embed blocks alongside the plain-text
         * `content`. Existing customers not passing `embeds` are unaffected.
         */
        ...(data.embeds && { embeds: data.embeds }),
        ...(data.customData || {}),
      }).body
    );

    return {
      id: response.data.id,
      date: response.data.timestamp,
    };
  }
}
