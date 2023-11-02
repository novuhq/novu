import {
  ChannelTypeEnum,
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';

export class PusherBeamsPushProvider implements IPushProvider {
  id = 'pusher-beams';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      instanceId: string;
      secretKey: string;
    }
  ) {
    this.axiosInstance = axios.create({
      baseURL: `https://${this.config.instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${this.config.instanceId}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.secretKey}`,
      },
    });
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { sound, badge, ...overrides } = options.overrides ?? {};
    const payload = {
      users: options.target,
      apns: {
        aps: {
          alert: {
            title: options.title,
            body: options.content,
          },
          badge: badge,
          category: overrides.categoryId,
          sound: sound,
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
          sound: sound,
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
    };

    const response = await this.axiosInstance.post(`/publishes/users`, payload);

    return {
      id: response.data.publishId,
      date: new Date().toISOString(),
    };
  }
}
