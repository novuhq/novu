import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';

import { Pushwoosh } from 'web-push-notifications';

type triggeredFunctionType = () => void;

export class PushwooshPushProvider implements IPushProvider {
  id = 'pushwoosh';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  pushwooshInstance = new Pushwoosh();

  constructor(
    private config: {
      applicationCode: string;
      defaultNotificationTitle?: string;
      autoSubscribe?: boolean;
      triggeredFunction?: triggeredFunctionType;
      userId?: string;
      tags?: object;
      defaultNotificationImageURL?: string;
    }
  ) {
    this.pushwooshInstance.push([
      'init',
      {
        applicationCode: this.config.applicationCode,
        defaultNotificationTitle: this.config.defaultNotificationTitle,
        defaultNotificationImage: this.config.defaultNotificationImageURL,
        autoSubscribe: this.config.autoSubscribe,
        userId: this.config.userId,
        tags: this.config.tags,
      },
    ]);
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    await this.pushwooshInstance.push(function (api) {
      this.pushwooshInstance.addEventHandler(options.title, function (payload) {
        this.config.triggeredFunction(payload);
      });
    });

    return {
      id: this.id,
      date: new Date().toISOString(),
    };
  }
}
