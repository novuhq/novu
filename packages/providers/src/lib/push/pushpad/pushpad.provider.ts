import { PushProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import Pushpad from 'pushpad';

export class PushpadPushProvider implements IPushProvider {
  id = PushProviderIdEnum.Pushpad;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private pushpad: Pushpad.Pushpad;

  constructor(
    private config: {
      apiKey: string;
      appId: string;
    }
  ) {
    this.pushpad = new Pushpad.Pushpad({
      authToken: this.config.apiKey,
      projectId: this.config.appId,
    });
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const notification = this.buildNotification(options, bridgeProviderData);

    const notificationId = await new Promise((resolve, reject) => {
      notification.deliverTo(options.target, function (err, result) {
        if (err) {
          return reject(err);
        }

        return resolve(result.id);
      });
    });

    return {
      id: String(notificationId),
      date: new Date().toISOString(),
    };
  }

  private buildNotification(
    options: IPushOptions,
    bridgeProviderData: Record<string, unknown>
  ): Pushpad.Notification {
    return new Pushpad.Notification({
      project: this.pushpad,
      body: options.content,
      title: options.title,
      ...bridgeProviderData,
    });
  }
}
