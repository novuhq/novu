import { ChannelTypeEnum } from '@novu/shared';
import { OnesignalPushProvider } from '@novu/onesignal';
import { BasePushHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class OneSignalHandler extends BasePushHandler {
  constructor() {
    super('onesignal', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey || !credentials.applicationId) {
      throw Error('Config is not valid for onesignal');
    }

    this.provider = new OnesignalPushProvider({
      appId: credentials.applicationId,
      apiKey: credentials.apiKey,
    });
  }
}
