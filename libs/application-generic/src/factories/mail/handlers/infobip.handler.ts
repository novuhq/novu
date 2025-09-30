import { InfobipEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class InfobipEmailHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.Infobip, ChannelTypeEnum.EMAIL);
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
