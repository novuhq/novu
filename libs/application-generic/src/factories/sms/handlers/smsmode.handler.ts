import { SmsmodeSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class SmsmodeHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Smsmode, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config = { apiKey: credentials.apiKey, from: credentials.from };

    this.provider = new SmsmodeSmsProvider(config);
  }
}
