import { PushProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class PusherBeamsPushProvider
  extends BaseProvider
  implements IPushProvider
{
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  id = PushProviderIdEnum.PusherBeams;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      instanceId: string;
      secretKey: string;
    },
  ) {
    super();
    this.axiosInstance = axios.create({
      baseURL: `https://${this.config.instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${this.config.instanceId}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.secretKey}`,
      },
    });
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
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
