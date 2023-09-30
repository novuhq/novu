import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { SmsCentralSmsProvider } from '@novu/sms-central';

export class SmsCentralHandler extends BaseSmsHandler {
  constructor() {
    super('sms-central', ChannelTypeEnum.SMS);
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
