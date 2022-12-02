import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BurstSmsProvider } from '@novu/burst-sms';
import { BaseSmsHandler } from './base.handler';

export class BurstSmsHandler extends BaseSmsHandler {
  constructor() {
    super('burst-sms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: {
      apiKey: string;
      secretKey: string;
    } = { apiKey: credentials.apiKey, secretKey: credentials.secretKey };

    this.provider = new BurstSmsProvider(config);
  }
}
