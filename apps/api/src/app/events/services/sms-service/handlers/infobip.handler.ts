import { InfobipSmsProvider } from '@novu/infobip';
import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';
export class InfobipSmsHandler extends BaseSmsHandler {
  constructor() {
    super('infobip', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: {
      baseUrl: string;
      apiKey: string;
      from?: string;
    } = { baseUrl: credentials.baseUrl, apiKey: credentials.apiKey, from: credentials.from };

    this.provider = new InfobipSmsProvider(config);
  }
}
