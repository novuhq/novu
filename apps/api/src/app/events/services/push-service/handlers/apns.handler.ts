import { ChannelTypeEnum } from '@novu/shared';
import { APNSPushProvider } from '@novu/apns';
import { BasePushHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class APNSHandler extends BasePushHandler {
  constructor() {
    super('apns', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    console.log('apns test');
    if (!credentials.secretKey || !credentials.apiKey || !credentials.projectName) {
      throw Error('Config is not valid for apns');
    }
    console.log('apns brr');
    this.provider = new APNSPushProvider({
      key: credentials.secretKey,
      keyId: credentials.apiKey,
      teamId: credentials.projectName,
    });
  }
}
