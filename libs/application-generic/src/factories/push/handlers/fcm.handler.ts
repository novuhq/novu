import {
  ChannelTypeEnum,
  ICredentials,
  PushProviderIdEnum,
} from '@novu/shared';
import { FcmPushProvider } from '@novu/providers';
import { BasePushHandler } from './base.handler';

export class FCMHandler extends BasePushHandler {
  constructor() {
    super(PushProviderIdEnum.FCM, ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    const credentialConfig: IFcmConfig = {
      user: credentials.user,
      serviceAccount: credentials.serviceAccount,
    };

    const updatedCredentials = credentialConfig.serviceAccount
      ? credentialConfig.serviceAccount
      : credentialConfig.user;

    if (!updatedCredentials) {
      throw new Error('Config is not valid for fcm');
    }

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
