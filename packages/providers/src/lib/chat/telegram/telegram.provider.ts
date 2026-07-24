import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import Axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { ISendMessageRes } from './types/telegram.types';

export class TelegramChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.Telegram;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;

  constructor(private config: { botToken: string }) {
    super();
    this.baseUrl = `https://api.telegram.org/bot${this.config.botToken}`;
    this.axiosInstance = Axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.TELEGRAM_CHAT)) {
      throw new Error('Invalid channel data for Telegram provider');
    }

    const { chatId } = options.channelData.endpoint;

    const payload = this.transform(bridgeProviderData, {
      chat_id: chatId,
      text: options.content,
    }).body;

    const { data } = await this.axiosInstance.post<ISendMessageRes>(`${this.baseUrl}/sendMessage`, payload);

    return {
      id: String(data.result.message_id),
      date: new Date(data.result.date != null ? data.result.date * 1000 : Date.now()).toISOString(),
    };
  }
}
