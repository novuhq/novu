import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { SmsCentralSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class SmsCentralHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.SmsCentral, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    if (!credentials.user || !credentials.password || !credentials.from) {
      throw Error('Invalid credentials');
    }

    const config = {
      username: credentials.user,
      password: credentials.password,
      from: credentials.from,
      baseUrl: credentials.baseUrl,
    };

    this.provider = new SmsCentralSmsProvider(config);
  }
}
