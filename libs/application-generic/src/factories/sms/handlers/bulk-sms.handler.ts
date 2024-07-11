import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BulkSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class BulkSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.BulkSms, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config = {
      apiToken: credentials.apiToken,
    };
    this.provider = new BulkSmsProvider(config);
  }
}
