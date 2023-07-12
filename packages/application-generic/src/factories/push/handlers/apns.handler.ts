import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { APNSPushProvider } from '@novu/apns';
import { BasePushHandler } from './base.handler';

export class APNSHandler extends BasePushHandler {
  constructor() {
    super('apns', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (
      !credentials.secretKey ||
      !credentials.apiKey ||
      !credentials.projectName
    ) {
      throw new Error('Config is not valid for apns');
    }
    this.provider = new APNSPushProvider({
      key: credentials.secretKey,
      keyId: credentials.apiKey,
      teamId: credentials.projectName,
      bundleId: credentials.applicationId as string,
      production: credentials.secure ?? false,
    });
  }
}
