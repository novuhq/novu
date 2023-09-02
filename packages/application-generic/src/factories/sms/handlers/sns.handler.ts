import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { SNSSmsProvider } from '@novu/sns';
import { SNSConfig } from '@novu/sns/build/main/lib/sns.config';
import { BaseSmsHandler } from './base.handler';

export class SnsHandler extends BaseSmsHandler {
  constructor() {
    super('sns', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new SNSSmsProvider({
      accessKeyId: credentials.apiKey,
      secretAccessKey: credentials.secretKey,
      region: credentials.region,
    });
  }
}
