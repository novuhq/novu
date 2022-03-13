import { ChannelTypeEnum } from '@notifire/shared';
import { ICredentials } from '@notifire/dal';
import { Sms77SmsProvider } from '@notifire/sms77';
import { BaseSmsHandler } from './base.handler';

export class Sms77Handler extends BaseSmsHandler {
  constructor() {
    super('sns', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: { apiKey: string; from?: string } = { apiKey: credentials.apiKey, from };

    this.provider = new Sms77SmsProvider(config);
  }
}
