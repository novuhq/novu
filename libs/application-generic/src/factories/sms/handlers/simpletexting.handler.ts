import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { SimpletextingSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class SimpletextingSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Simpletexting, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config = {
      apiKey: credentials.apiKey,
      accountPhone: credentials.from,
    };

    this.provider = new SimpletextingSmsProvider(config);
  }
}
