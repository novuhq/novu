import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { SmsmodeSmsProvider } from '@novu/smsmode';
import { BaseSmsHandler } from './base.handler';

export class SmsmodeHandler extends BaseSmsHandler {
  constructor() {
    super('smsmode', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new SmsmodeSmsProvider({
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
