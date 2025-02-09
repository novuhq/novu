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

export class Msg91SmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Msg91;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  axiosInstance: AxiosInstance;

  constructor(
    private config: {
      authKey: string;
      apiUrl?: string;
    },
  ) {
    super();
    this.axiosInstance = axios.create({
      baseURL: this.config.apiUrl || 'https://control.msg91.com/api/v5/flow',
      headers: {
        authkey: this.config.authKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const { customData } = options;
    const params = this.transform(bridgeProviderData, {
      template_id: options.content,
      recipients: [
        {
          mobiles: options.to,
          ...customData?.variables,
        },
      ],
      ...(customData?.shortUrl && {
        short_url: customData?.shortUrl,
      }),
      ...(customData?.shortUrlExpiry && {
        short_url_expiry: customData?.shortUrlExpiry,
      }),
      ...(customData?.realTimeResponse && {
        realTimeResponse: customData?.realTimeResponse,
      }),
    }).body;

    const response = await this.axiosInstance.request({
      method: 'POST',
      data: params,
    });

    return {
      id: response.data.message,
      date: new Date().toISOString(),
    };
  }
}
