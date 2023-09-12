import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';

export class CustomSmsProvider implements ISmsProvider {
  id = 'custom-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      baseUrl?: string;
      apiKey?: string;
      secretKey?: string;
      from?: string;
    }
  ) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        apiKey: config.apiKey,
        secretKey: config.secretKey,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.axiosInstance.request({
      method: 'POST',
      data: {
        ...options,
        from: this.config.from,
      },
    });

    return {
      id: response.data.id,
      date: response.data.date,
    };
  }
}
