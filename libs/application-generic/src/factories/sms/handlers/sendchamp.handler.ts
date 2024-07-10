import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { SendchampSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class SendchampSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Sendchamp, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey || !credentials.from) {
      throw Error('Invalid credentials');
    }

    const config = {
      apiKey: credentials.apiKey,
      from: credentials.from,
    };

    this.provider = new SendchampSmsProvider(config);
  }
}
