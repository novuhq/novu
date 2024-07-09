import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { PlivoSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class PlivoHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Plivo, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new PlivoSmsProvider({
      accountSid: credentials.accountSid,
      authToken: credentials.token,
      from: credentials.from,
    });
  }
}
