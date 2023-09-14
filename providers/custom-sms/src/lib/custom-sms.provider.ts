import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';

export class CustomSmsProvider implements ISmsProvider {
  id = 'custom-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      baseUrl?: string;
      apiKey?: string;
      secretKey?: string;
      from?: string;
      method?: string;
      apiKeyAttribute?: string;
      secretKeyAttribute?: string;
      idPath?: string;
      datePath?: string;
    }
  ) {
    const headers = {
      [this.config?.apiKeyAttribute]: config.apiKey,
    };

    if (this.config?.secretKeyAttribute && this.config?.secretKey) {
      headers[this.config?.secretKeyAttribute] = config.secretKey;
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
      method: this.config?.method || 'POST',
      data: {
        ...options,
        from: this.config.from,
      },
    });

    let id = null;
    let date = null;
    const responseData = response.data;

    if (this.config.idPath) {
      const path = this.config.idPath.split('.');
      id = path.reduce((acc, curr) => acc[curr], responseData);
    } else {
      id = responseData.id;
    }

    if (this.config.datePath) {
      const path = this.config.datePath.split('.');
      date = path.reduce((acc, curr) => acc[curr], responseData);
    } else {
      date = responseData.date;
    }

    return { id, date };
  }
}
