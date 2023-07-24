import { ChannelTypeEnum } from '@novu/shared';
import { OneSignalPushProvider } from '@novu/one-signal';
import { BasePushHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class OneSignalHandler extends BasePushHandler {
  constructor() {
    super('one-signal', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey || !credentials.applicationId) {
      throw Error('Config is not valid for OneSignal');
    }

    this.provider = new OneSignalPushProvider({
      appId: credentials.applicationId,
      apiKey: credentials.apiKey,
    });
  }
}
