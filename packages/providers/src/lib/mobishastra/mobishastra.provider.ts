import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import axios, { AxiosInstance } from 'axios';

export class MobishastraProvider implements ISmsProvider {
  id = 'mobishastra';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  axiosInstance: AxiosInstance;
  headers: Record<string, string>;

  constructor(
    private config: {
      baseUrl: string;
      username: string;
      password: string;
      language?: string;
      from: string;
    }
  ) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.axiosInstance.request({
      method: 'POST',
      data: JSON.stringify([
        {
          Sender: options.from || this.config.from,
          number: options.to,
          msg: options.content,
          user: this.config.username,
          pwd: this.config.password,
        },
      ]),
    });

    const responseData = response;

    return {
      id: responseData?.[0]?.msg_id,
      date: new Date().toISOString(),
    };
  }
}
