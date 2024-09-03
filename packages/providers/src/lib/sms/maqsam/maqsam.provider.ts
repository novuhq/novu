import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import axios, { AxiosInstance } from 'axios';
import { fromUnixTime } from 'date-fns';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class MaqsamSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Maqsam;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      accessKeyId?: string;
      accessSecret?: string;
      from?: string;
    },
  ) {
    super();
    this.axiosInstance = axios.create({
      baseURL: 'https://api.maqsam.com/v2/sms',
      auth: {
        username: config.accessKeyId,
        password: config.accessSecret,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const maqsamResponse = await this.axiosInstance.request({
      method: 'POST',
      data: this.transform(bridgeProviderData, {
        to: options.to,
        message: options.content,
        sender: options.from || this.config.from,
      }).body,
    });

    return {
      id: maqsamResponse.data.message.identifier,
      date: fromUnixTime(maqsamResponse.data.message.timestamp).toISOString(),
    };
  }
}
