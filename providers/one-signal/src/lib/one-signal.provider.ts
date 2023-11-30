import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';

export class OneSignalPushProvider implements IPushProvider {
  id = 'one-signal';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  private axiosInstance: AxiosInstance;
  public readonly BASE_URL = 'https://onesignal.com/api/v1';

  constructor(
    private config: {
      appId: string;
      apiKey: string;
    }
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.BASE_URL,
    });
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { sound, badge, ...overrides } = options.overrides ?? {};

    const notification = {
      include_player_ids: options.target,
      app_id: this.config.appId,
      headings: { en: options.title },
      contents: { en: options.content },
      subtitle: { en: overrides.subtitle },
      data: options.payload,
      ios_badge_type: 'Increase',
      ios_badge_count: 1,
      ios_sound: sound,
      android_sound: sound,
      mutable_content: overrides.mutableContent,
      android_channel_id: overrides.channelId,
      small_icon: overrides.icon,
      large_icon: overrides.icon,
      chrome_icon: overrides.icon,
      firefox_icon: overrides.icon,
      ios_category: overrides.categoryId,
    };

    const notificationOptions: AxiosRequestConfig = {
      url: '/notifications',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.config.apiKey}`,
      },
      data: JSON.stringify(notification),
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
