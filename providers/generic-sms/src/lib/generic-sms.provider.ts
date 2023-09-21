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
  private axiosInstance: AxiosInstance;

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
    }
  ) {
    const headers = {
      [this.config?.apiKeyRequestHeader]: config.apiKey,
    };

    if (this.config?.secretKeyRequestHeader && this.config?.secretKey) {
      headers[this.config?.secretKeyRequestHeader] = config.secretKey;
    }

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers,
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.axiosInstance.request({
      method: 'POST',
      data: {
        ...options,
        from: this.config.from,
      },
    });

    const responseData = response.data;

    return {
      id: this.getResponseValue(this.config.idPath, responseData, 'id'),
      date: this.getResponseValue(this.config.datePath, responseData, 'date'),
    };
  }

  private getResponseValue(path: string, data: any, attribute: string) {
    if (path) {
      const pathArray = path.split('.');

      return pathArray.reduce((acc, curr) => acc[curr], data);
    } else {
      return data[attribute];
    }
  }
}
