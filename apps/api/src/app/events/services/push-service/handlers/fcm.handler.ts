import { ChannelTypeEnum } from '@novu/shared';
import { FcmPushProvider } from '@novu/fcm';
import { BasePushHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class FCMHandler extends BasePushHandler {
  constructor() {
    super('fcm', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    const credentialConfig: IFcmConfig = { user: credentials.user, serviceAccount: credentials.serviceAccount };

    if (!credentials.user && !credentials.serviceAccount) {
      throw new Error('Config is not valid for fcm');
    }
    const updatedCredentials = credentialConfig.serviceAccount
      ? credentialConfig.serviceAccount
      : credentialConfig.user;

    const config = JSON.parse(updatedCredentials);
    this.provider = new FcmPushProvider({
      projectId: config.project_id,
      email: config.client_email,
      secretKey: config.private_key,
    });
  }
}

interface IFcmConfig {
  user?: string;
  serviceAccount?: string;
}
