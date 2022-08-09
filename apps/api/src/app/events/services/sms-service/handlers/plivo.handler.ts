import { ChannelTypeEnum } from '@novu/shared';
import { PlivoSmsProvider } from '@novu/plivo';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';

export class PlivoHandler extends BaseSmsHandler {
  constructor() {
    super('plivo', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: {
      accountSid: string;
      authToken: string;
      from: string;
    } = { accountSid: credentials.accountSid, authToken: credentials.token, from: credentials.from };

    this.provider = new PlivoSmsProvider(config);
  }
}
