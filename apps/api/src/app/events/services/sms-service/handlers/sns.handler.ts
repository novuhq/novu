import { ChannelTypeEnum } from '@notifire/shared';
import { SNSSmsProvider } from '@notifire/sns';
import { SNSConfig } from '@notifire/sns/build/main/lib/sns.config';
import { ICredentials } from '@notifire/dal';
import { BaseSmsHandler } from './base.handler';

export class SnsHandler extends BaseSmsHandler {
  constructor() {
    super('sns', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: SNSConfig = {
      accessKeyId: credentials.apiKey,
      secretAccessKey: credentials.secretKey,
    };

    this.provider = new SNSSmsProvider(config);
  }
}
