import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class GenericSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.GenericSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  axiosInstance: AxiosInstance;
  headers: Record<string, string>;

  constructor(
    private config: {
      baseUrl: string;
      apiKeyRequestHeader: string;
      apiKey: string;
      secretKeyRequestHeader?: string;
      secretKey?: string;
      from: string;
      idPath?: string;
      datePath?: string;
      authenticateByToken?: boolean;
      domain?: string;
      authenticationTokenKey?: string;
    },
  ) {
    super();
    this.headers = {
      [this.config?.apiKeyRequestHeader]: config.apiKey,
    };

    if (this.config?.secretKeyRequestHeader && this.config?.secretKey) {
      this.headers[this.config?.secretKeyRequestHeader] = config.secretKey;
    }

    if (!this.config?.authenticateByToken) {
      this.axiosInstance = axios.create({
        baseURL: config.baseUrl,
        headers: this.headers,
      });
    }
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      ...options,
      sender: options.from || this.config.from,
    });
    if (this.config?.authenticateByToken) {
      const tokenAxiosInstance = await axios.request({
        method: 'POST',
        baseURL: this.config.domain,
        headers: this.headers,
      });

      const token =
        tokenAxiosInstance.data.data[this.config.authenticationTokenKey];

      this.axiosInstance = axios.create({
        baseURL: this.config.baseUrl,
        headers: {
          [this.config.authenticationTokenKey]: token,
          ...data.headers,
        },
      });
    }

    const response = await this.axiosInstance.request({
      method: 'POST',
      data: data.body,
    });

    const responseData = response.data;

    return {
      id: this.getResponseValue(this.config.idPath || 'id', responseData),
      date:
        this.getResponseValue(this.config.datePath || 'date', responseData) ||
        new Date().toISOString(),
    };
  }

  private getResponseValue(path: string, data: any) {
    const pathArray = path.split('.');

    return pathArray.reduce((acc, curr) => acc[curr], data);
  }
}
