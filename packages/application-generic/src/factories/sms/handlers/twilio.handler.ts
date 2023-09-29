import { TwilioSmsProvider } from '@novu/twilio';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class TwilioHandler extends BaseSmsHandler {
  constructor() {
    super('twilio', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new TwilioSmsProvider({
      accountSid: credentials.accountSid,
      authToken: credentials.token,
      from: credentials.from,
    });
  }
}
