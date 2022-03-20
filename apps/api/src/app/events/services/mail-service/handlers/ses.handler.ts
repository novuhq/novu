import { ChannelTypeEnum } from '@notifire/shared';
import { ICredentials } from '@notifire/dal';
import { SESConfig } from '@notifire/ses/build/module/lib/ses.config';
import { SESEmailProvider } from '@notifire/ses';
import { BaseHandler } from './base.handler';

export class SESHandler extends BaseHandler {
  constructor() {
    super('ses', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: SESConfig = {
      region: credentials.region,
      accessKeyId: credentials.apiKey,
      secretAccessKey: credentials.secretKey,
      from,
    };

    this.provider = new SESEmailProvider(config);
  }
}
