import {
  ChannelTypeEnum,
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import PushNotifications from '@pusher/push-notifications-server';

export class PusherBeamsPushProvider implements IPushProvider {
  id = 'pusher-beams';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private beamsClient: PushNotifications;
  constructor(
    private config: {
      instanceId: string;
      secretKey: string;
    }
  ) {
    this.beamsClient = new PushNotifications({
      instanceId: this.config.instanceId,
      secretKey: this.config.secretKey,
    });
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { sound, badge, ...overrides } = options.overrides ?? {};

    const res = await this.beamsClient.publishToUsers(options.target, {
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
    });

    return {
      id: res.publishId,
      date: new Date().toISOString(),
    };
  }
}
