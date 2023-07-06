import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { SparkPostEmailProvider } from '@novu/sparkpost';

import { BaseHandler } from './base.handler';

export class SparkPostHandler extends BaseHandler {
  constructor() {
    super('sparkpost', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config = {
      from: from as string,
      apiKey: credentials.apiKey as string,
      eu: credentials.eu as boolean,
      senderName: credentials.senderName as string,
    };

    this.provider = new SparkPostEmailProvider(config);
  }
}
