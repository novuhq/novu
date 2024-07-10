import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { BrevoSmsProvider } from '@novu/providers';

export class BrevoSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.BrevoSms, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey || !credentials.from) {
      throw Error('Invalid credentials');
    }

    const config = {
      apiKey: credentials.apiKey,
      from: credentials.from,
    };

    this.provider = new BrevoSmsProvider(config);
  }
}
