import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { SESConfig } from '@novu/providers';
import { SESEmailProvider } from '@novu/providers';
import { BaseHandler } from './base.handler';

export class SESHandler extends BaseHandler {
  constructor() {
    super('ses', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    const config: SESConfig = {
      region: credentials.region as string,
      accessKeyId: credentials.apiKey as string,
      secretAccessKey: credentials.secretKey as string,
      senderName: credentials.senderName ?? 'no-reply',
      from: from as string,
    };

    this.provider = new SESEmailProvider(config);
  }
}
