import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { GupshupSmsProvider } from '@novu/providers';

export class GupshupSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Gupshup, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new GupshupSmsProvider({
      userId: credentials.user,
      password: credentials.password,
    });
  }
}
