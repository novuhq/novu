import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { MandrillProvider, MandrillConfig } from '@novu/mandrill';
import { BaseHandler } from './base.handler';

export class MandrillHandler extends BaseHandler {
  constructor() {
    super('mandrill', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: MandrillConfig = { from, apiKey: credentials.apiKey };

    this.provider = new MandrillProvider(config);
  }
}
