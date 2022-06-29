import { ChannelTypeEnum } from '@novu/shared';
import { FcmPushProvider } from '@novu/fcm';
import { BasePushHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class FCMHandler extends BasePushHandler {
  constructor() {
    super('fcm', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new FcmPushProvider({
      secretKey: credentials.secretKey,
    });
  }
}
