import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BrevoSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

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
