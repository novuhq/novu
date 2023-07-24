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
      eu: false,
      senderName: credentials.senderName as string,
    };

    if (credentials.region?.toLowerCase() === 'eu') {
      config.eu = true;
    }

    this.provider = new SparkPostEmailProvider(config);
  }
}
