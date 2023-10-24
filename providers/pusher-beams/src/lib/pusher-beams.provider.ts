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
    const res = await this.beamsClient.publishToUsers(
      options.target,
      options.payload as PushNotifications.PublishRequest
    );

    return {
      id: res.publishId,
      date: new Date().toISOString(),
    };
  }
}
