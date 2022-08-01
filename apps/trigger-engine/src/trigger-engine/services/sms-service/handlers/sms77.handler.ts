import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { Sms77SmsProvider } from '@novu/sms77';
import { BaseSmsHandler } from './base.handler';

export class Sms77Handler extends BaseSmsHandler {
  constructor() {
    super('sms77', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: { apiKey: string; from?: string } = { apiKey: credentials.apiKey, from: credentials.from };

    this.provider = new Sms77SmsProvider(config);
  }
}
