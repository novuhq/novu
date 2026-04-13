import { MessenteSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class MessenteSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Messente, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new MessenteSmsProvider({
      username: credentials.user,
      password: credentials.password,
    });
  }
}
