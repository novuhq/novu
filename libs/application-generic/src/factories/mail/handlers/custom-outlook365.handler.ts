import { CustomOutlook365Provider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class CustomOutlook365Handler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.CustomOutlook365, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      from: string;
      senderName: string;
      password: string;
    } = {
      from: credentials.from as string,
      senderName: credentials.senderName as string,
      password: credentials.password as string,
    };
    this.provider = new CustomOutlook365Provider(config);
  }
}
