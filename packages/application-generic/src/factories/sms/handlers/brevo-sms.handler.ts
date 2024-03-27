import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { BrevoSmsProvider } from '@novu/brevo-sms';

export class BrevoSmsHandler extends BaseSmsHandler {
  constructor() {
    super('brevo-sms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey || !credentials.from) {
      throw Error('Invalid credentials');
    }

    const config = {
      apiKey: credentials.apiKey,
      from: credentials.from,
    };

    this.provider = new BrevoSmsProvider(config);
  }
}
