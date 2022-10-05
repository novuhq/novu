import { ChannelTypeEnum } from '@novu/shared';
import { ExpoPushProvider } from '@novu/expo';
import { BasePushHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class ExpoHandler extends BasePushHandler {
  constructor() {
    super('expo', ChannelTypeEnum.PUSH);
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
