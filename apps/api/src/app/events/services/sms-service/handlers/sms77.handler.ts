import { Sms77Config } from '@novu/sms77/build/main/lib/sms77.config';
import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { Sms77SmsProvider } from '@novu/sms77';
import { BaseSmsHandler } from './base.handler';

export class Sms77Handler extends BaseSmsHandler {
  constructor() {
    super('sms77', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: Sms77Config = { apiKey: credentials.apiKey, from: credentials.from };

    this.provider = new Sms77SmsProvider(config);
  }
}
