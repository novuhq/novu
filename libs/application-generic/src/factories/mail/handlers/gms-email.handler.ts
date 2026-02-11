import { GmsEmailEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class GmsEmailHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.GmsEmail, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    const config: {
      baseUrl: string;
      from: string;
      senderName: string;
    } = {
      baseUrl: credentials.baseUrl as string,
      from: from as string,
      senderName: credentials.senderName as string,
    };

    this.provider = new GmsEmailEmailProvider(config);
  }
}
