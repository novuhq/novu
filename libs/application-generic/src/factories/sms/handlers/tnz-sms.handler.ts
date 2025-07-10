import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { TnzSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class TnzSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Tnz, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey) {
      throw new Error('Invalid credentials');
    }

    const config = {
      authToken: credentials.apiKey,
    };

    this.provider = new TnzSmsProvider(config);
  }
}
