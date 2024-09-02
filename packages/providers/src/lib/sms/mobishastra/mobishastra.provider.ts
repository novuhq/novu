import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { SmsProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class MobishastraProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Mobishastra;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  axiosInstance: AxiosInstance;
  headers: Record<string, string>;

  constructor(
    private config: {
      baseUrl: string;
      username: string;
      password: string;
      language?: string;
      from: string;
    },
  ) {
    super();
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const transformedData = this.transform(bridgeProviderData, {
      Sender: options.from || this.config.from,
      number: options.to,
      msg: options.content,
      user: this.config.username,
      pwd: this.config.password,
    });
    const response = await this.axiosInstance.request({
      method: 'POST',
      data: JSON.stringify([transformedData.body]),
      headers: transformedData.headers,
    });

    const responseData = response.data?.[0];
    const messageId = responseData?.msg_id?.trim();

    if (!messageId) {
      const errorMessage =
        responseData?.str_response || 'Failed to send message';
      throw new Error(errorMessage);
    }

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }
}
