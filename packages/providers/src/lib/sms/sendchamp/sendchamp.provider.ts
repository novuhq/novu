import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class SendchampSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Sendchamp;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;
  public readonly BASE_URL = 'https://api.sendchamp.com/v1';
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      apiKey: string;
      from?: string;
    },
  ) {
    super();
    this.axiosInstance = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      sender_name: options.from || this.config.from,
      to: options.to,
      message: options.content,
      route: 'international',
    });

    const response = await this.axiosInstance.post(`/sms/send`, payload);

    return {
      id: response.data.data.business_id,
      date: response.data.data.created_at,
    };
  }
}
