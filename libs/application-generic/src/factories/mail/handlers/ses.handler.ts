import { SESConfig, SESEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, IConfigurations, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class SESHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.SES, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials & IConfigurations, from?: string) {
    const config: SESConfig = {
      region: credentials.region as string,
      accessKeyId: credentials.apiKey as string,
      secretAccessKey: credentials.secretKey as string,
      senderName: credentials.senderName ?? 'no-reply',
      from: from as string,
      configurationSetName: credentials.configurationSetName,
    };

    this.provider = new SESEmailProvider(config);
  }
}
