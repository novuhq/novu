import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { Sms77SmsProvider } from '@novu/sms77';
import { BaseSmsHandler } from './base.handler';

export class Sms77Handler extends BaseSmsHandler {
  constructor() {
    super('sms77', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new Sms77SmsProvider({
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
