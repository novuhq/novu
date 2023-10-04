import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { SmsToViberSmsProvider } from 'providers/sms-to-viber/build/main';

export class SmsToViberSmsHandler extends BaseSmsHandler {
  constructor() {
    super('sms-to-viber', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey) {
      throw Error('Invalid credentials');
    }
    const config = {
      apiKey: credentials.apiKey,
      from: credentials.from,
    };
    this.provider = new SmsToViberSmsProvider(config);
  }
}
