import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { SESConfig } from '@novu/ses/build/module/lib/ses.config';
import { SESEmailProvider } from '@novu/ses';
import { BaseHandler } from './base.handler';

export class SESHandler extends BaseHandler {
  constructor() {
    super('ses', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config: SESConfig = {
      region: credentials.region,
      accessKeyId: credentials.apiKey,
      secretAccessKey: credentials.secretKey,
      from,
    };

    this.provider = new SESEmailProvider(config);
  }
}
