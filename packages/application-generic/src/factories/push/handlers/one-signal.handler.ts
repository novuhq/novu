import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { OneSignalPushProvider } from '@novu/one-signal';
import { BasePushHandler } from './base.handler';

export class OneSignalHandler extends BasePushHandler {
  constructor() {
    super('one-signal', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (
      !credentials.userKey ||
      !credentials.applicationId ||
      !credentials.appKey
    ) {
      throw Error('Config is not valid for OneSignal');
    }

    this.provider = new OneSignalPushProvider({
      appId: credentials.applicationId,
      appKey: credentials.appKey,
      userKey: credentials.userKey,
    });
  }
}
