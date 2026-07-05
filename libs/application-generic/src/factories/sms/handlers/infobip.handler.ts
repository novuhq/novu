import { InfobipSmsProvider, resolveSafeInfobipBaseUrl } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class InfobipSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Infobip, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const baseUrl = resolveSafeInfobipBaseUrl(credentials.baseUrl);

    this.provider = new InfobipSmsProvider({
      baseUrl,
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
