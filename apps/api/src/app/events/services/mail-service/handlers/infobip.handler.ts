import { InfobipEmailProvider } from '@novu/infobip';
import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BaseHandler } from './base.handler';

export class InfobipEmailHandler extends BaseHandler {
  constructor() {
    super('infobip', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials) {
    const config: {
      baseUrl: string;
      apiKey: string;
      from?: string;
    } = { baseUrl: credentials.baseUrl, apiKey: credentials.apiKey, from: credentials.from };

    this.provider = new InfobipEmailProvider(config);
  }
}
