import { ChannelTypeEnum } from '@notifire/shared';
import { ICredentials } from '@notifire/dal';
import { MandrillProvider } from '@notifire/mandrill';
import { BaseHandler } from './base.handler';

export class MandrillHandler extends BaseHandler {
  constructor() {
    super('mandrill', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from: string) {
    const config: { apiKey: string; from: string } = { from, apiKey: credentials.apiKey };

    this.provider = new MandrillProvider(config);
  }
}
