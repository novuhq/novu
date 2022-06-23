import { ChannelTypeEnum } from '@novu/node';
import { PlivoSmsProvider, PlivoConfig } from '@novu/plivo';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';

export class PlivoHandler extends BaseSmsHandler {
  constructor() {
    super('plivo', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: PlivoConfig = {
      accountSid: credentials.accountSid,
      authToken: credentials.token,
      from: credentials.from,
    };

    this.provider = new PlivoSmsProvider(config);
  }
}
