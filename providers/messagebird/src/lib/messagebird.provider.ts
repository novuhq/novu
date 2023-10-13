import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';

export class MessagebirdSmsProvider implements ISmsProvider {
  id: 'messagebird';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly BASE_URL = 'https://rest.messagebird.com';
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `AccessKey ${this.config.apiKey}`, // Use 'AccessKey' as the authentication type
        Accept: 'application/json', // Set 'Accept' header to 'application/json'
      },
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const payload = {
      originator: options.from, // Use 'originator' instead of 'sender_name'
      body: options.content, // Use 'body' instead of 'message'
      recipients: [options.to], // Use an array of recipients msisdns
    };

    const response = await this.axiosInstance.post(`/messages`, payload);

    return {
      id: response.data.id,
      date: response.data.createdDatetime,
    };
  }
}
