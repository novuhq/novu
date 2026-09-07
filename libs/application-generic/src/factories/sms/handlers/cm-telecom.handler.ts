import { CmTelecomSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class CmTelecomHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.CmTelecom, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new CmTelecomSmsProvider({
      productToken: credentials.apiToken,
      from: credentials.from,
    });
  }
}
