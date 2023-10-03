import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { SmsToSmsProvider } from '@novu/sms-to';
import { BaseSmsHandler } from './base.handler';

export class SmstoSmsHandler extends BaseSmsHandler {
  constructor() {
    super('sms-to', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    if (!credentials.apiKey) {
      throw Error('Invalid credentials');
    }
    const config = {
      apiKey: credentials.apiKey,
      from: credentials.from,
    };
    this.provider = new SmsToSmsProvider(config);
  }
}
