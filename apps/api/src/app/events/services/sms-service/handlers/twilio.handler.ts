import { TwilioSmsProvider } from '@notifire/twilio';
import { ChannelTypeEnum } from '@notifire/shared';
import { ICredentials } from '@notifire/dal';
import { BaseSmsHandler } from './base.handler';

export class TwilioHandler extends BaseSmsHandler {
  constructor() {
    super('twilio', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: {
      accountSid: string;
      authToken: string;
      from: string;
    } = { accountSid: credentials.accountSid, authToken: credentials.token, from };

    this.provider = new TwilioSmsProvider(config);
  }
}
