import { ChannelTypeEnum } from '@novu/shared';
import { SNSSmsProvider, SNSConfig } from '@novu/sns';
import { ICredentials } from '@novu/dal';
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
