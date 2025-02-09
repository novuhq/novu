import { Msg91SmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class Msg91SmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Msg91, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new Msg91SmsProvider({
      authKey: credentials.apiKey,
      apiUrl: credentials.apiURL,
    });
  }
}
