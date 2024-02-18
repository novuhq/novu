import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import * as Pushpad from 'pushpad';

export class PushpadPushProvider implements IPushProvider {
  id = 'pushpad';
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
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const notification = this.buildNotification(options);

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

  private buildNotification(options: IPushOptions): Pushpad.Notification {
    return new Pushpad.Notification({
      project: this.pushpad,
      body: options.content,
      title: options.title,
    });
  }
}
