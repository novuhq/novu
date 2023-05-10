import { ChannelTypeEnum } from '@novu/shared';
import { PushApiPushProvider } from '@novu/push-api';
import { BasePushHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class PushAPIHandler extends BasePushHandler {
  constructor() {
    super('push-api', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.privateKey || !credentials.publicKey) {
      throw new Error('Config is not valid for Push API');
    }
    this.provider = new PushApiPushProvider({
      vapidPrivateKey: credentials.privateKey,
      vapidPublicKey: credentials.publicKey,
    });
  }
}
