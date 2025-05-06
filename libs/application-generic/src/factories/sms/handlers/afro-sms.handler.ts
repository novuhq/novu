import { AfroSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class AfroSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.AfroSms, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new AfroSmsProvider({
      apiKey: credentials.apiKey,
      senderName: credentials.senderName,
      from: credentials.from,
    });
  }
}
