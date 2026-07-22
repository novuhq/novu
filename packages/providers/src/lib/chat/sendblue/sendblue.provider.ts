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
import { ISendblueMessageResponse } from './types/sendblue.types';

export class SendblueChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.Sendblue;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;

  private readonly axiosClient: AxiosInstance;
  private readonly baseUrl = 'https://api.sendblue.co/api/';

  constructor(
    private config: {
      apiKey: string;
      secretKey: string;
      from: string;
    }
  ) {
    super();
    this.axiosClient = Axios.create({
      headers: {
        'sb-api-key-id': this.config.apiKey,
        'sb-api-secret-key': this.config.secretKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.PHONE)) {
      throw new Error('Invalid channel data for Sendblue provider');
    }

    const { phoneNumber } = options.channelData.endpoint;

    const payload = this.transform(bridgeProviderData, {
      number: phoneNumber,
      from_number: this.config.from,
      content: options.content,
    }).body;

    const { data } = await this.axiosClient.post<ISendblueMessageResponse>(`${this.baseUrl}send-message`, payload);

    if (data.status === 'ERROR') {
      throw new Error(data.error_message ?? 'Sendblue failed to send the message');
    }

    return {
      id: data.message_handle,
      date: data.date_created ?? new Date().toISOString(),
    };
  }
}
