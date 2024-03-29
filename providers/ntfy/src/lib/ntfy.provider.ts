import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';

export class NtfyPushProvider implements IPushProvider {
  id = 'ntfy';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      topic: string;
      baseUrl?: string;
    }
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl || 'https://ntfy.sh',
    });
    this.config = config;
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const notificationOptions: AxiosRequestConfig = {
      method: 'POST',
      data: JSON.stringify({
        topic: this.config.topic,
        message: options.content,
      }),
      headers: {
        Title: options.title,
        Click: options.overrides.clickAction,
      },
    };

    const res = await this.axiosInstance.request<{ id: string }>(
      notificationOptions
    );

    return {
      id: res?.data.id,
      date: new Date().toISOString(),
    };
  }
}
