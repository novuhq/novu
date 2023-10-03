import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';

export class SmsToSmsProvider implements ISmsProvider {
  id = 'sms-to';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly BASE_URL = 'https://api.sms.to';
  public readonly ENDPOINT = '/sms/send';
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
      sender_id: this.config.from,
      to: options.to,
      message: options.content,
    };

    const response = await this.axiosInstance.post(this.ENDPOINT, payload);

    return {
      id: response.data.message_id,
      date: new Date().toISOString(),
    };
  }
}
