import { EightByEightSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class EightByEightSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.EightByEightSms, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new EightByEightSmsProvider({
      apiKey: credentials.apiKey,
      subAccountId: credentials.subAccountId,
      from: credentials.from,
    });
  }
}
