import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import {
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import Axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { ILineSentMessagesResponse } from './line.types';

type LineMessageType = 'text' | 'flex' | 'image' | 'sticker';

export class LineChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.Line;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  private readonly axiosClient: AxiosInstance;

  constructor(private config: { channelAccessToken: string }) {
    super();
    this.axiosClient = Axios.create({
      baseURL: 'https://api.line.me/v2/bot/message',
      headers: {
        Authorization: `Bearer ${this.config.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.LINE_USER)) {
      throw new Error('Invalid channel data for LINE provider');
    }

    const to = options.channelData.endpoint.userId;
    // Override/passthrough `messages` replaces the body-derived default. Seeding a text
    // message alongside it would concatenate (deepmerge arrays) and send both.
    const triggerData = this.hasMessagesOverride(bridgeProviderData)
      ? { to }
      : { to, messages: [this.buildMessage(options)] };

    const payload = this.transform(bridgeProviderData, triggerData).body;

    const { data } = await this.axiosClient.post<ILineSentMessagesResponse>('/push', payload);

    return {
      id: data.sentMessages?.[0]?.id,
      date: new Date().toISOString(),
    };
  }

  /**
   * True when an override source that wins in `transform` supplies a `messages` array.
   * Highest-priority source first — matches WhatsApp's dual-source resolution order.
   */
  private hasMessagesOverride(bridgeProviderData: WithPassthrough<Record<string, unknown>>): boolean {
    const { _passthrough = {}, ...bridgeData } = bridgeProviderData;
    const passthroughBody = (_passthrough.body || {}) as Record<string, unknown>;
    const sources = [passthroughBody, bridgeData as Record<string, unknown>];

    return sources.some((source) => Array.isArray(source.messages));
  }

  private buildMessage(options: IChatOptions): Record<string, unknown> {
    const customData = options.customData ?? {};
    const richTypes: LineMessageType[] = ['flex', 'image', 'sticker'];

    for (const type of richTypes) {
      if (type in customData) {
        const payload = customData[type];

        if (typeof payload !== 'object' || payload === null) {
          throw new Error(`Invalid LINE ${type} message payload: expected an object`);
        }

        return { ...(payload as Record<string, unknown>), type };
      }
    }

    return { type: 'text', text: options.content };
  }
}
