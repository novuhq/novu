import { ChannelTypeEnum } from '@notifire/core';
import { PlivoSmsProvider } from '@notifire/plivo';
import { ICredentials } from '@notifire/dal';
import { BaseSmsHandler } from './base.handler';

export class PlivoHandler extends BaseSmsHandler {
  constructor() {
    super('plivo', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: {
      accountSid: string;
      authToken: string;
      from: string;
    } = { accountSid: credentials.accountSid, authToken: credentials.token, from };

    this.provider = new PlivoSmsProvider(config);
  }
}
