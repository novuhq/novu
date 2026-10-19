import { RuachSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class RuachSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.RuachSms, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new RuachSmsProvider({
      apiKey: credentials.apiKey,
      clientId: credentials.clientId,
      from: credentials.from,
    });
  }
}
