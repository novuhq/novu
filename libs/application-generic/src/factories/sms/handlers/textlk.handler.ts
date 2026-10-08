import { TextLkSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class TextLkSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.TextLk, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new TextLkSmsProvider({
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
