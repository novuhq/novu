import { InfobipSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { resolveInfobipSmsBaseUrl } from '../../../utils/infobip-sms-credentials';
import { BaseSmsHandler } from './base.handler';

export class InfobipSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Infobip, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const baseUrl = resolveInfobipSmsBaseUrl(credentials.baseUrl);

    this.provider = new InfobipSmsProvider({
      baseUrl,
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
