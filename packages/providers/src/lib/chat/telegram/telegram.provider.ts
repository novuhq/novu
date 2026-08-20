import { ChatProviderIdEnum } from '@novu/shared';
import {
  CardElement,
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  IChatRenderResult,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import Axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { cardToTelegramHtml } from './card-render.utils';
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

  /**
   * Rich Chat: Telegram has no native card payload, so degrade the `CardElement` to an HTML string
   * and send it with `parse_mode: HTML` (far more robust than MarkdownV2's heavy escaping).
   */
  async render(card: CardElement): Promise<IChatRenderResult> {
    return {
      nativePayload: { parse_mode: 'HTML' },
      content: cardToTelegramHtml(card),
      validation: [],
    };
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
      // Rich Chat forwards `{ parse_mode: 'HTML' }` here so the HTML body from `render()` is formatted.
      ...(options.nativePayload ?? {}),
    }).body;

    const { data } = await this.axiosInstance.post<ISendMessageRes>(`${this.baseUrl}/sendMessage`, payload);

    return {
      id: String(data.result.message_id),
      date: new Date(data.result.date != null ? data.result.date * 1000 : Date.now()).toISOString(),
    };
  }

  async updateMessage(
    options: IChatOptions,
    identifier: string,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.TELEGRAM_CHAT)) {
      throw new Error('Invalid channel data for Telegram provider');
    }

    const { chatId } = options.channelData.endpoint;
    const nativePayload = options.nativePayload ?? {};

    const payload = this.transform(bridgeProviderData, {
      chat_id: chatId,
      message_id: identifier,
      text: options.content,
      ...nativePayload,
      reply_markup: nativePayload.reply_markup ?? { inline_keyboard: [] },
    }).body;

    const { data } = await this.axiosInstance.post<ISendMessageRes>(`${this.baseUrl}/editMessageText`, payload);

    return {
      id: String(data.result.message_id),
      date: new Date(data.result.date != null ? data.result.date * 1000 : Date.now()).toISOString(),
    };
  }
}
