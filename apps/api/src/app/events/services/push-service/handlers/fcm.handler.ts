import { ChannelTypeEnum } from '@novu/shared';
import { FcmPushProvider } from '@novu/fcm';
import { BasePushHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class FCMHandler extends BasePushHandler {
  constructor() {
    super('fcm', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.user) {
      throw Error('Config is not valid for fcm');
    }
    const config = JSON.parse(credentials.user);
    this.provider = new FcmPushProvider({
      projectId: config.project_id,
      email: config.client_email,
      secretKey: config.private_key,
    });
  }
}
