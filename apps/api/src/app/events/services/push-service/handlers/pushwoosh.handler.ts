import { ChannelTypeEnum } from '@novu/shared';
import { PushwooshPushProvider } from '@novu/pushwoosh';
import { BasePushHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class PushwooshHandler extends BasePushHandler {
  constructor() {
    super('pushwoosh', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    const credentialConfig: IPushwooshConfig = {
      applicationCode: credentials.applicationCode,
      defaultNotificationTitle: credentials.defaultNotificationTitle,
      autoSubscribe: credentials.autoSubscribe,
      userId: credentials.userId,
      tags: credentials.tags,
      defaultNotificationImageURL: credentials.defaultNotificationImageURL,
      triggeredFunction: credentials.triggeredFunction,
    };

    if (
      !credentials.applicationCode &&
      !credentials.defaultNotificationTitle &&
      !credentials.autoSubscribe &&
      !credentials.triggeredFunction
    ) {
      throw new Error('Config is not valid for pushwoosh');
    }

    this.provider = new PushwooshPushProvider({
      applicationCode: credentials.applicationCode,
      defaultNotificationTitle: credentials.defaultNotificationTitle,
      autoSubscribe: credentials.autoSubscribe,
      userId: credentials.userID,
      tags: credentials.tags,
      defaultNotificationImageURL: credentials.defaultNotificationImageURL,
      triggeredFunction: credentials.triggeredFunction,
    });
  }
}

interface IPushwooshConfig {
  applicationCode?: string;
  defaultNotificationTitle?: string;
  autoSubscribe?: boolean;
  triggeredFunction?: any;
  userId?: string;
  tags?: object;
  defaultNotificationImageURL?: string;
}
