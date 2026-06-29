import { ValueFirstSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class ValueFirstSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.ValueFirst, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new ValueFirstSmsProvider({
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
