import { InfobipEmailProvider } from '@novu/infobip';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
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
    } = {
      baseUrl: credentials.baseUrl as string,
      apiKey: credentials.apiKey as string,
      from: credentials.from,
    };

    this.provider = new InfobipEmailProvider(config);
  }
}
