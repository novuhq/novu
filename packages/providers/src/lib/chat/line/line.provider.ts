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
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
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
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for LINE provider');
    }

    const to = options.channelData.endpoint.url;

    const payload = this.transform(bridgeProviderData, {
      to,
      messages: [this.buildMessage(options)],
    }).body;

    const { data } = await this.axiosClient.post<ILineSentMessagesResponse>('/push', payload);

    return {
      id: data.sentMessages?.[0]?.id,
      date: new Date().toISOString(),
    };
  }

  private buildMessage(options: IChatOptions): Record<string, unknown> {
    const customData = options.customData ?? {};
    const richTypes: LineMessageType[] = ['flex', 'image', 'sticker'];

    for (const type of richTypes) {
      if (type in customData) {
        return { type, ...customData[type] };
      }
    }

    return { type: 'text', text: options.content };
  }
}
