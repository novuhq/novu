import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { FortySixElksSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class FortySixElksHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.FortySixElks, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new FortySixElksSmsProvider({
      user: credentials.user,
      password: credentials.password,
      from: credentials.from,
    });
  }
}
