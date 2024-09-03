import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import qs from 'qs';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class BurstSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.BurstSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      apiKey?: string;
      secretKey?: string;
    },
  ) {
    super();
    this.axiosInstance = axios.create({
      auth: {
        username: config.apiKey,
        password: config.secretKey,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const data = qs.stringify(
      this.transform(bridgeProviderData, {
        message: options.content,
        to: options.to,
        from: options.from,
      }).body,
    );

    const response = await this.axiosInstance.post(
      'https://api.transmitsms.com/send-sms.json',
      data,
    );

    return {
      id: response.data.message_id,
      date: response.data.send_at,
    };
  }
}
