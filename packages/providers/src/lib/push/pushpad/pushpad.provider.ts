import { PushProviderIdEnum } from '@novu/shared';
import { IPushOptions, IPushProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import Pushpad from 'pushpad';
import { CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { PushBaseProvider } from '../push.base-provider';

export class PushpadPushProvider extends PushBaseProvider implements IPushProvider {
  id = PushProviderIdEnum.Pushpad;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;

  private pushpad: Pushpad.Pushpad;

  constructor(
    private config: {
      apiKey: string;
      appId: string;
    }
  ) {
    super();
    this.pushpad = new Pushpad.Pushpad({
      authToken: this.config.apiKey,
      projectId: this.config.appId,
    });
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const notification = this.buildNotification(options, bridgeProviderData);

    const notificationId = await new Promise((resolve, reject) => {
      notification.deliverTo(options.target, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result.id);
      });
    });

    return {
      id: String(notificationId as string),
      date: new Date().toISOString(),
    };
  }

  private buildNotification(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): Pushpad.Notification {
    const messageId = (options.payload as { __nvMessageId?: string } | undefined)?.__nvMessageId;

    return new Pushpad.Notification(
      this.transform(bridgeProviderData, {
        project: this.pushpad,
        body: options.content,
        title: options.title,
        // Pushpad only hands custom_data to action button callbacks, so clicks on the notification body can't report back.
        ...(messageId && { customData: String(messageId) }),
      }).body
    );
  }
}
