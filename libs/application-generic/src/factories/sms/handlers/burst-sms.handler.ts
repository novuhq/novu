import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BurstSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class BurstSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.BurstSms, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new BurstSmsProvider({
      apiKey: credentials.apiKey,
      secretKey: credentials.secretKey,
    });
  }
}
