import { FcmPushProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, PushProviderIdEnum } from '@novu/shared';
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

    let config: Record<string, unknown>;
    try {
      config = JSON.parse(updatedCredentials);
    } catch {
      throw new Error(
        'FCM credentials must be a valid JSON service account configuration. Received a non-JSON string instead.'
      );
    }

    this.provider = new FcmPushProvider({
      projectId: config.project_id as string,
      email: config.client_email as string,
      secretKey: config.private_key as string,
    });
  }

  isTokenInvalid(errorMessage: string): boolean {
    return this.provider.isTokenInvalid(errorMessage);
  }
}

interface IFcmConfig {
  user?: string;
  serviceAccount?: string;
}
