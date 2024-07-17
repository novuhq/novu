import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { FiretextSmsProvider } from '@novu/providers';

export class FiretextSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Firetext, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new FiretextSmsProvider({
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
