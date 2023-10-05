import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { HashmailEmailProvider } from '@novu/hashmail';

import { BaseHandler } from './base.handler';

export class HashmailHandler extends BaseHandler {
  constructor() {
    super('hashmail', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    const config: { apiKey: string; from: string } = {
      apiKey: credentials.apiKey as string,
      from: from as string,
    };

    this.provider = new HashmailEmailProvider(config);
  }
}
