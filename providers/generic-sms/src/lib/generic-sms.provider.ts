import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import axios, { AxiosInstance } from 'axios';

export class GenericSmsProvider implements ISmsProvider {
  id = 'generic-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
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
    }
  ) {
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
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
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
        },
      });
    }

    const response = await this.axiosInstance.request({
      method: 'POST',
      data: {
        ...options,
        sender: options.from || this.config.from,
      },
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
