import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { AzureSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class AzureSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.AzureSms, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.accessKey) {
      throw new Error('Access key is undefined');
    }
    const config = {
      connectionString: credentials.accessKey,
    };

    this.provider = new AzureSmsProvider(config);
  }
}
