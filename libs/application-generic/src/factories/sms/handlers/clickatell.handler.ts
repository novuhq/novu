import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { ClickatellSmsProvider } from '@novu/providers';
import { BaseSmsHandler } from './base.handler';

export class ClickatellHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Clickatell, ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new ClickatellSmsProvider({ apiKey: credentials.apiKey });
  }
}
