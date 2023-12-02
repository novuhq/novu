import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { D7SmsProvider } from '@novu/d7';
import { BaseSmsHandler } from './base.handler';

export class D7SmsHandler extends BaseSmsHandler {
  constructor() {
    super('d7', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new D7SmsProvider({ apiKey: credentials.apiKey });
  }
}
