import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { MandrillProvider } from '@novu/mandrill';
import { BaseHandler } from './base.handler';

export class MandrillHandler extends BaseHandler {
  constructor() {
    super('mandrill', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config: { apiKey: string; from: string } = {
      from: from as string,
      apiKey: credentials.apiKey as string,
    };

    this.provider = new MandrillProvider(config);
  }
}
