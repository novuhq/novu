import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { ClickatellSmsProvider } from '@novu/clickatell';
import { BaseSmsHandler } from './base.handler';

export class ClickatellHandler extends BaseSmsHandler {
  constructor() {
    super('clickatell', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: { apiKey: string } = { apiKey: credentials.apiKey };

    this.provider = new ClickatellSmsProvider(config);
  }
}
