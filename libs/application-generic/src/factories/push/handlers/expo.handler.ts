import {
  ChannelTypeEnum,
  ICredentials,
  PushProviderIdEnum,
} from '@novu/shared';
import { ExpoPushProvider } from '@novu/providers';
import { BasePushHandler } from './base.handler';

export class ExpoHandler extends BasePushHandler {
  constructor() {
    super(PushProviderIdEnum.EXPO, ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey) {
      throw Error('Config is not valid for expo');
    }

    this.provider = new ExpoPushProvider({
      accessToken: credentials.apiKey,
    });
  }
}
