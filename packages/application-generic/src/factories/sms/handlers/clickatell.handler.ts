import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { ClickatellSmsProvider } from '@novu/clickatell';
import { BaseSmsHandler } from './base.handler';

export class ClickatellHandler extends BaseSmsHandler {
  constructor() {
    super('clickatell', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new ClickatellSmsProvider({ apiKey: credentials.apiKey });
  }
}
