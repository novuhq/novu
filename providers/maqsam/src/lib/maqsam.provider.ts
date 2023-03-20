import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import axios, { AxiosInstance } from 'axios';
import moment from 'moment';

export class MaqsamSmsProvider implements ISmsProvider {
  id = 'maqsam';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      accessKeyId?: string;
      accessSecret?: string;
      from: string;
    }
  ) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.maqsam.com/v2/sms',
      auth: {
        username: config.accessKeyId,
        password: config.accessSecret,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const mapsamResponse = await this.axiosInstance.request({
      method: 'POST',
      data: {
        to: options.to,
        message: options.content,
        sender: this.config.from,
      },
    });

    return {
      id: mapsamResponse.data.message.identifier,
      date: moment.unix(mapsamResponse.data.message.timestamp).toISOString(),
    };
  }
}
