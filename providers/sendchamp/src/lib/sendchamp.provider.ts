import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';

export class SendchampSmsProvider implements ISmsProvider {
  id: 'sendchamp';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly BASE_URL = 'https://api.sendchamp.com/v1';
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      apiKey: string;
      from?: string;
    }
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const payload = {
      sender_name: options.from || this.config.from,
      to: options.to,
      message: options.content,
      route: 'international',
    };

    const response = await this.axiosInstance.post(`/sms/send`, payload);

    return {
      id: response.data.data.business_id,
      date: response.data.data.created_at,
    };
  }
}
