import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { Sms77SmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class Sms77Handler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Sms77, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new Sms77SmsProvider({
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
