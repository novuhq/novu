import {
  ChannelTypeEnum,
  ICredentials,
  PushProviderIdEnum,
} from '@novu/shared';
import { OneSignalPushProvider } from '@novu/providers';
import { BasePushHandler } from './base.handler';

export class OneSignalHandler extends BasePushHandler {
  constructor() {
    super(PushProviderIdEnum.OneSignal, ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey || !credentials.applicationId) {
      throw Error('Config is not valid for OneSignal');
    }

    this.provider = new OneSignalPushProvider({
      appId: credentials.applicationId,
      apiKey: credentials.apiKey,
      apiVersion: credentials.apiVersion as 'externalId' | 'playerModel' | null,
    });
  }
}
