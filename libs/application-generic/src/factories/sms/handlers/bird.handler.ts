import { BirdSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class BirdSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Bird, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new BirdSmsProvider({
      apiKey: credentials.apiKey as string,
      from: credentials.from,
    });
  }
}
