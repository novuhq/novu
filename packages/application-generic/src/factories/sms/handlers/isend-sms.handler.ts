import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { ISendSmsProvider } from '@novu/isend-sms';
import { BaseSmsHandler } from './base.handler';

export class ISendSmsHandler extends BaseSmsHandler {
  constructor() {
    super('isend-sms', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      apiToken: string;
    } = {
      apiToken: credentials.apiToken ?? '',
      ...credentials,
    };

    this.provider = new ISendSmsProvider(config);
  }
}
