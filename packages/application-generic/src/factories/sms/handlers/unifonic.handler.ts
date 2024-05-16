import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { UnifonicSmsProvider } from '@novu/providers';

export class UnifonicSmsHandler extends BaseSmsHandler {
  constructor() {
    super('unifonic-sms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey || !credentials.from) {
      throw Error('Invalid credentials');
    }

    const config = {
      appSid: credentials.apiKey,
      senderId: credentials.from,
    };

    this.provider = new UnifonicSmsProvider(config);
  }
}
