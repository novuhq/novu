import { PushProviderIdEnum } from '@novu/shared';
import { IPushOptions, IPushProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import { AxiosInstance } from 'axios';
import { CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { resolveSafePusherBeamsBaseUrl } from '../../../utils/safe-pusher-beams-url';
import { WithPassthrough } from '../../../utils/types';
import { PushBaseProvider } from '../push.base-provider';

export class PusherBeamsPushProvider extends PushBaseProvider implements IPushProvider {
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  id = PushProviderIdEnum.PusherBeams;

  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      instanceId: string;
      secretKey: string;
    }
  ) {
    super();
    const baseURL = resolveSafePusherBeamsBaseUrl(this.config.instanceId);

    this.axiosInstance = createProviderHttpClient({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.secretKey}`,
      },
    });
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { sound, badge, ...overrides } = options.overrides ?? {};
    const payload = this.transform(bridgeProviderData, {
      users: options.target,
      apns: {
        aps: {
          alert: {
            title: options.title,
            body: options.content,
          },
          badge,
          category: overrides.categoryId,
          sound,
        },
        data: options.payload,
      },
      fcm: {
        notification: {
          title: options.title,
          body: options.content,
          android_channel_id: overrides.channelId,
          click_action: overrides.clickAction,
          color: overrides.color,
          icon: overrides.icon,
          sound,
          tag: overrides.tag,
        },
        data: options.payload,
        time_to_live: overrides.ttl,
      },
      web: {
        notification: {
          title: options.title,
          body: options.content,
          icon: overrides.icon,
        },
        data: options.payload,
        time_to_live: overrides.ttl,
      },
    }).body;

    const response = await this.axiosInstance.post(`/publishes/users`, payload);

    return {
      id: response.data.publishId,
      date: new Date().toISOString(),
    };
  }
}
