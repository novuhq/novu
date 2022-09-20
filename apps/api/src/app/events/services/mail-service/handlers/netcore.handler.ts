import { ChannelTypeEnum } from '@novu/shared';
import { NetCoreProvider } from '@novu/netcore';
import { BaseHandler } from './base.handler';

export class NetCoreHandler extends BaseHandler {
  constructor() {
    super('netcore', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials, from?: string) {
    const config: { apiKey: string; from: string } = { apiKey: credentials.apiKey, from };

    this.provider = new NetCoreProvider(config);
  }
}
