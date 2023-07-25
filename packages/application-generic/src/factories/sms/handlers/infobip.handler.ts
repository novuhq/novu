import { InfobipSmsProvider } from '@novu/infobip';
import { ChannelTypeEnum, SmsProviderIdEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';
export class InfobipSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Infobip, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new InfobipSmsProvider({
      baseUrl: credentials.baseUrl,
      apiKey: credentials.apiKey,
      from: credentials.from,
    });
  }
}
