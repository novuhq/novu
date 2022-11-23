import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';
import { BurstSmsSmsProvider } from '@novu/burstsms';

export class BurstSmsHandler extends BaseSmsHandler {
  constructor() {
    super('burstsms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: {
      apiKey: string;
      secretKey: string;
    } = { apiKey: credentials.apiKey, secretKey: credentials.secretKey };

    this.provider = new BurstSmsSmsProvider(config);
  }
}
