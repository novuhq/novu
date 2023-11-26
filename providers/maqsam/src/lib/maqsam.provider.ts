import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import axios, { AxiosInstance } from 'axios';
import { fromUnixTime } from 'date-fns';

export class MaqsamSmsProvider implements ISmsProvider {
  id = 'maqsam';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      accessKeyId?: string;
      accessSecret?: string;
      from?: string;
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
    const maqsamResponse = await this.axiosInstance.request({
      method: 'POST',
      data: {
        to: options.to,
        message: options.content,
        sender: options.from || this.config.from,
      },
    });

    return {
      id: maqsamResponse.data.message.identifier,
      date: fromUnixTime(maqsamResponse.data.message.timestamp).toISOString(),
    };
  }
}
