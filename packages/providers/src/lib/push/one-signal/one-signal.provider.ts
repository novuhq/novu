import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { ChannelTypeEnum, ISendMessageSuccessResponse, IPushOptions, IPushProvider } from '@novu/stateless';
import { PushProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class OneSignalPushProvider extends BaseProvider implements IPushProvider {
  id = PushProviderIdEnum.OneSignal;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  private axiosInstance: AxiosInstance;
  private apiVersion: string | null = null;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  public readonly BASE_URL_PLAYER_MODEL = 'https://onesignal.com/api/v1';
  public readonly BASE_URL_USER_MODEL = 'https://api.onesignal.com';

  constructor(
    private config: {
      appId: string;
      apiKey: string;
      apiVersion?: 'externalId' | 'playerModel' | null;
    }
  ) {
    super();
    this.apiVersion = config.apiVersion;

    this.axiosInstance = axios.create({
      baseURL: config.apiVersion === 'externalId' ? this.BASE_URL_USER_MODEL : this.BASE_URL_PLAYER_MODEL,
    });
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { sound, badge, ...overrides } = options.overrides ?? {};

    const targetSegment =
      this.apiVersion === 'externalId'
        ? {
            include_aliases: {
              external_id: options.target,
            },
            target_channel: 'push',
          }
        : { include_player_ids: options.target };

    const notification = this.transform(bridgeProviderData, {
      ...targetSegment,
      app_id: this.config.appId,
      headings: { en: options.title },
      contents: { en: options.content },
      subtitle: { en: overrides.subtitle },
      data: options.payload,
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      ios_sound: sound,
      android_sound: sound,
      mutable_content: overrides.mutableContent,
      android_channel_id: overrides.channelId,
      small_icon: overrides.icon,
      large_icon: overrides.icon,
      chrome_icon: overrides.icon,
      firefox_icon: overrides.icon,
      ios_category: overrides.categoryId,
    }).body;

    const notificationOptions: AxiosRequestConfig = {
      url: '/notifications',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.config.apiKey}`,
      },
      data: JSON.stringify(notification),
    };

    const res = await this.axiosInstance.request<{ id: string }>(notificationOptions);

    return {
      id: res?.data.id,
      date: new Date().toISOString(),
    };
  }

  protected override keyCaseObject: Record<string, string> = {
    is_ios: 'isIos',
    is_android: 'isAndroid',
    is_huawei: 'isHuawei',
    is_any_web: 'isAnyWeb',
    is_chrome_web: 'isChromeWeb',
    is_firefox: 'isFirefox',
    is_safari: 'isSafari',
    is_wp_wns: 'isWP_WNS',
    is_adm: 'isAdm',
    is_chrome: 'isChrome',
    ios_badge_type: 'ios_badgeType',
    ios_badge_count: 'ios_badgeCount',
  };
}
