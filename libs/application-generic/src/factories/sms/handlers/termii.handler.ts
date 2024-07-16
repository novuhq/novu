import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { TermiiSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class TermiiSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Termii, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new TermiiSmsProvider({
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
