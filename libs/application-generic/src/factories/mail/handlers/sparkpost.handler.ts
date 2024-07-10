import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ICredentials,
} from '@novu/shared';
import { SparkPostEmailProvider } from '@novu/providers';

import { BaseHandler } from './base.handler';

export class SparkPostHandler extends BaseHandler {
  constructor() {
    super(EmailProviderIdEnum.SparkPost, ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config = {
      from: from as string,
      apiKey: credentials.apiKey as string,
      region: credentials.region as string,
      senderName: credentials.senderName as string,
    };

    this.provider = new SparkPostEmailProvider(config);
  }
}
