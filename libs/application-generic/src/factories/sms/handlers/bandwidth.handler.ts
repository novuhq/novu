import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BandwidthSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class BandwidthHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Bandwidth, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config = {
      username: credentials.user,
      password: credentials.password,
      accountId: credentials.accountSid,
    };

    this.provider = new BandwidthSmsProvider(config);
  }
}
